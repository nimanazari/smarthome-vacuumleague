/* ============================================================
   pyreader.js  —  a tiny reader for SIMPLE Python.
   NOT a full Python engine — just enough to run the kind of code
   teams write for the robot:
     variables, if / elif / else, while, comparisons, and/or/not,
     + - * / % // **, parentheses, and abs/min/max/int/float/round.
   Usage:  const prog = PyReader.compile(source);  prog.run(vars);
   Parse/compile errors are thrown as Error("Line N: message").
   ============================================================ */
(function (root) {
  'use strict';

  // ---------- expression tokenizer ----------
  function tokenize(s, line) {
    const t = [], id = /[A-Za-z0-9_]/, ids = /[A-Za-z_]/;
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if ((c >= '0' && c <= '9') || (c === '.' && s[i + 1] >= '0' && s[i + 1] <= '9')) {
        let j = i + 1; while (j < s.length && /[0-9.]/.test(s[j])) j++;
        t.push({ k: 'num', v: parseFloat(s.slice(i, j)) }); i = j; continue;
      }
      if (ids.test(c)) {
        let j = i + 1; while (j < s.length && id.test(s[j])) j++;
        const w = s.slice(i, j); i = j;
        if (w === 'and' || w === 'or' || w === 'not') t.push({ k: 'op', v: w });
        else if (w === 'True') t.push({ k: 'num', v: true });
        else if (w === 'False') t.push({ k: 'num', v: false });
        else if (w === 'None') t.push({ k: 'num', v: null });
        else t.push({ k: 'name', v: w });
        continue;
      }
      const two = s.substr(i, 2);
      if (['==', '!=', '<=', '>=', '**', '//'].indexOf(two) >= 0) { t.push({ k: 'op', v: two }); i += 2; continue; }
      if ('+-*/%<>()'.indexOf(c) >= 0) { t.push({ k: 'op', v: c }); i++; continue; }
      if (c === ',') { t.push({ k: 'comma' }); i++; continue; }
      throw { line, msg: "unexpected character '" + c + "'" };
    }
    t.push({ k: 'eof' });
    return t;
  }

  // ---------- expression parser (precedence climbing) ----------
  function parseExpr(text, line) {
    const t = tokenize(text, line); let p = 0;
    const peek = () => t[p];
    const isOp = (v) => t[p].k === 'op' && t[p].v === v;
    const eat = () => t[p++];

    function orE() { let l = andE(); while (isOp('or')) { eat(); l = { n: 'or', l, r: andE() }; } return l; }
    function andE() { let l = notE(); while (isOp('and')) { eat(); l = { n: 'and', l, r: notE() }; } return l; }
    function notE() { if (isOp('not')) { eat(); return { n: 'not', e: notE() }; } return cmpE(); }
    function cmpE() {
      let l = addE();
      const c = ['<', '<=', '>', '>=', '==', '!='];
      while (peek().k === 'op' && c.indexOf(peek().v) >= 0) { const op = eat().v; l = { n: 'cmp', op, l, r: addE() }; }
      return l;
    }
    function addE() { let l = mulE(); while (peek().k === 'op' && (peek().v === '+' || peek().v === '-')) { const op = eat().v; l = { n: 'bin', op, l, r: mulE() }; } return l; }
    function mulE() { let l = unary(); while (peek().k === 'op' && ['*', '/', '%', '//'].indexOf(peek().v) >= 0) { const op = eat().v; l = { n: 'bin', op, l, r: unary() }; } return l; }
    function unary() { if (isOp('-')) { eat(); return { n: 'neg', e: unary() }; } if (isOp('+')) { eat(); return unary(); } return powE(); }
    function powE() { const b = atom(); if (isOp('**')) { eat(); return { n: 'bin', op: '**', l: b, r: unary() }; } return b; }
    function atom() {
      const tok = peek();
      if (tok.k === 'num') { eat(); return { n: 'lit', v: tok.v }; }
      if (tok.k === 'name') {
        eat();
        if (isOp('(')) { // function call
          eat(); const args = [];
          if (!isOp(')')) { args.push(orE()); while (peek().k === 'comma') { eat(); args.push(orE()); } }
          if (!isOp(')')) throw { line, msg: "expected ')'" };
          eat(); return { n: 'call', name: tok.v, args };
        }
        return { n: 'var', name: tok.v };
      }
      if (isOp('(')) { eat(); const e = orE(); if (!isOp(')')) throw { line, msg: "expected ')'" }; eat(); return e; }
      throw { line, msg: 'unexpected ' + (tok.k === 'eof' ? 'end of expression' : "'" + (tok.v) + "'") };
    }

    const node = orE();
    if (peek().k !== 'eof') throw { line, msg: "unexpected '" + (peek().v) + "'" };
    return node;
  }

  // ---------- line preprocessing ----------
  function preprocess(src) {
    // editors on Windows often save with a BOM and/or non-breaking spaces —
    // strip them so a team's file does not fail with a baffling error
    src = String(src).replace(/^﻿/, '').replace(/ /g, ' ');
    // drop the optional "EDITOR SETUP" block — it exists only to stop code
    // editors from underlining the sensor names; the game must not run it.
    // Blank the lines instead of deleting them, so error line numbers still
    // match what the team sees in their own editor.
    src = src.replace(/^[ \t]*#\s*=+\s*EDITOR SETUP[\s\S]*?END EDITOR SETUP[^\n]*/m, (block) => block.replace(/[^\n]/g, ''));
    const out = [], lines = src.split(/\r?\n/);
    for (let n = 0; n < lines.length; n++) {
      let raw = lines[n];
      const h = raw.indexOf('#'); if (h >= 0) raw = raw.slice(0, h);
      const m = raw.match(/^([ \t]*)/);
      const indent = m[1].replace(/\t/g, '    ').length;
      const text = raw.slice(m[1].length).replace(/\s+$/, '');
      if (text === '') continue;
      out.push({ indent, text, line: n + 1 });
    }
    return out;
  }

  // ---------- statement parser (indentation based) ----------
  function parseSuite(L, i, indent) {
    const stmts = [];
    while (i < L.length && L[i].indent === indent) {
      const ln = L[i];
      if (/^(if|while)\b/.test(ln.text)) { const r = parseCompound(L, i, indent); stmts.push(r[0]); i = r[1]; }
      else if (/^def\b/.test(ln.text)) { const r = parseDef(L, i, indent); stmts.push(r[0]); i = r[1]; }
      else if (/^(elif|else)\b/.test(ln.text)) { throw { line: ln.line, msg: "'" + ln.text.match(/^\w+/)[0] + "' without matching 'if'" }; }
      else { stmts.push(parseSimple(ln)); i++; }
      if (i < L.length && L[i].indent > indent) throw { line: L[i].line, msg: 'unexpected indentation' };
    }
    return [stmts, i];
  }

  function header(ln, kw) {
    let rest = ln.text.slice(kw.length).trim();
    if (!rest.endsWith(':')) throw { line: ln.line, msg: "expected ':' at end of line" };
    rest = rest.slice(0, -1).trim();
    if (rest === '') throw { line: ln.line, msg: 'expected a condition' };
    return parseExpr(rest, ln.line);
  }

  function parseCompound(L, i, indent) {
    const head = L[i], kw = head.text.match(/^(if|while)/)[1];
    const cond = header(head, kw); i++;
    if (i >= L.length || L[i].indent <= indent) throw { line: head.line, msg: 'expected an indented block' };
    let body; const r = parseSuite(L, i, L[i].indent); body = r[0]; i = r[1];
    if (kw === 'while') return [{ t: 'while', cond, body }, i];

    const clauses = [{ cond, body, line: head.line }];
    while (i < L.length && L[i].indent === indent && /^(elif|else)\b/.test(L[i].text)) {
      const cl = L[i];
      if (/^elif\b/.test(cl.text)) {
        const c2 = header(cl, 'elif'); i++;
        if (i >= L.length || L[i].indent <= indent) throw { line: cl.line, msg: 'expected an indented block' };
        const rr = parseSuite(L, i, L[i].indent); clauses.push({ cond: c2, body: rr[0], line: cl.line }); i = rr[1];
      } else {
        if (cl.text.replace(/\s/g, '') !== 'else:') throw { line: cl.line, msg: "expected 'else:'" };
        i++;
        if (i >= L.length || L[i].indent <= indent) throw { line: cl.line, msg: 'expected an indented block' };
        const rr = parseSuite(L, i, L[i].indent); clauses.push({ cond: null, body: rr[0], line: cl.line }); i = rr[1];
        break;
      }
    }
    return [{ t: 'if', clauses }, i];
  }

  // def name(a, b):  — a NAMED BLOCK: define once, call anywhere.
  function parseDef(L, i, indent) {
    const head = L[i];
    const m = head.text.match(/^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:$/);
    if (!m) throw { line: head.line, msg: "a function looks like:  def myname():" };
    const params = m[2].trim() === '' ? [] : m[2].split(',').map((x) => x.trim());
    for (const pm of params) if (!/^[A-Za-z_]\w*$/.test(pm)) throw { line: head.line, msg: "bad parameter name '" + pm + "'" };
    i++;
    if (i >= L.length || L[i].indent <= indent) throw { line: head.line, msg: 'expected an indented block after def' };
    const r = parseSuite(L, i, L[i].indent);
    return [{ t: 'def', name: m[1], params, body: r[0], line: head.line }, r[1]];
  }

  function parseSimple(ln) {
    if (ln.text === 'pass') return { t: 'pass' };
    const rm = ln.text.match(/^return\b\s*(.*)$/);
    if (rm) return { t: 'return', expr: rm[1].trim() === '' ? null : parseExpr(rm[1], ln.line), line: ln.line };
    const m = ln.text.match(/^([A-Za-z_]\w*)\s*(\+=|-=|\*=|\/=|=)(?!=)\s*(.*)$/);
    if (m) {
      if (m[3].trim() === '') throw { line: ln.line, msg: "expected a value after '" + m[2] + "'" };
      return { t: 'assign', name: m[1], op: m[2], expr: parseExpr(m[3], ln.line), line: ln.line };
    }
    // a bare call on its own line, e.g.  backward(5)
    if (/^[A-Za-z_]\w*\s*\(.*\)$/.test(ln.text)) {
      return { t: 'expr', expr: parseExpr(ln.text, ln.line), line: ln.line };
    }
    throw { line: ln.line, msg: "can't understand this line" };
  }

  // ---------- easy moves ----------
  // backward(5) means "drive backward for 5 seconds" — the reader itself keeps
  // the move going, no timer/state code needed. While a move is running, new
  // move calls are ignored until it finishes.
  const ACTIONS = { forward: [25, 25], backward: [-25, -25], turnleft: [-18, 18], turnright: [18, -18], stop: [0, 0] };

  // ---------- evaluator ----------
  const truthy = (v) => !(v === 0 || v === false || v === null || v === undefined);
  const pymod = (a, b) => ((a % b) + b) % b;

  function evalNode(node, vars) {
    switch (node.n) {
      case 'lit': return node.v;
      case 'var': {
        if (Object.prototype.hasOwnProperty.call(vars, node.name)) return vars[node.name];
        // help the user: suggest a real name that looks like the one they typed
        const n = node.name, known = Object.keys(vars);
        const near = known.filter((k) => k.length > 2 && (n.indexOf(k) === 0 || k.indexOf(n.slice(0, 4)) === 0));
        let msg = "there is no sensor or variable called '" + n + "'";
        if (near.length) msg += " - did you mean " + near.slice(0, 3).map((k) => "'" + k + "'").join(' or ') + "?";
        throw { runtime: true, msg };
      }
      case 'neg': return -evalNode(node.e, vars);
      case 'not': return !truthy(evalNode(node.e, vars));
      case 'and': { const a = evalNode(node.l, vars); return truthy(a) ? evalNode(node.r, vars) : a; }
      case 'or': { const a = evalNode(node.l, vars); return truthy(a) ? a : evalNode(node.r, vars); }
      case 'cmp': {
        const a = evalNode(node.l, vars), b = evalNode(node.r, vars);
        switch (node.op) { case '<': return a < b; case '<=': return a <= b; case '>': return a > b; case '>=': return a >= b; case '==': return a === b; case '!=': return a !== b; }
        return false;
      }
      case 'bin': {
        const a = evalNode(node.l, vars), b = evalNode(node.r, vars);
        switch (node.op) {
          case '+': return a + b; case '-': return a - b; case '*': return a * b;
          case '/': return a / b; case '%': return pymod(a, b); case '//': return Math.floor(a / b); case '**': return Math.pow(a, b);
        }
        return 0;
      }
      case 'call': {
        const a = node.args.map((x) => evalNode(x, vars));
        if (ACTIONS[node.name]) {
          if (!(vars._actSteps > 0)) {           // ignore new moves while one is running
            vars._act = node.name;
            vars._actSteps = Math.max(1, Math.round((+a[0] || 0) * 10));
          }
          return 0;
        }
        switch (node.name) {
          case 'abs': return Math.abs(a[0]); case 'min': return Math.min.apply(null, a); case 'max': return Math.max.apply(null, a);
          case 'int': return Math.trunc(a[0]); case 'float': return Number(a[0]); case 'round': return Math.round(a[0]);
          // seconds(2) -> timer steps for exactly 2 s of movement, counting the
          // step that starts the move (which sets the same wheels itself)
          case 'seconds': return Math.max(1, Math.round(a[0] * 10) - 1);
          // ---- position sensor helpers (cm, origin = bottom-left corner) ----
          // goto(x, y): drive to that point on the straight line (the reader
          // keeps steering every step until arrival; atgoal becomes 1 there)
          case 'goto': {
            vars._gotoX = +a[0] || 0; vars._gotoY = +a[1] || 0;
            vars._gotoOn = 1; vars._gotoMax = 1; vars.atgoal = 0;
            return 0;
          }
          // gotoslow(x, y): the same hands-free line, but at walking pace —
          // for when somebody is holding on to you
          case 'gotoslow': {
            vars._gotoX = +a[0] || 0; vars._gotoY = +a[1] || 0;
            vars._gotoOn = 1; vars._gotoMax = 0.55; vars.atgoal = 0;
            return 0;
          }
          case 'stopgoto': { vars._gotoOn = 0; return 0; }
          case 'distto': return Math.round(Math.hypot((+a[0] || 0) - vars.x, (+a[1] || 0) - vars.y));
          case 'angleto': {
            const deg = Math.atan2((+a[1] || 0) - vars.y, (+a[0] || 0) - vars.x) * 180 / Math.PI;
            return Math.round(((deg % 360) + 360) % 360);
          }
          // ---- the house directory (Assistive Technology league) ----
          // roomx(kitchen) / roomy(kitchen): ask the house where a room is.
          // -1 when this league does not publish room addresses.
          case 'roomx': case 'roomy': {
            const list = vars._rooms;
            const rm = list && list[(+a[0] || 0) - 1];
            if (!rm) return -1;
            return node.name === 'roomx' ? rm.x : rm.y;
          }
        }
        // ---- the team's OWN functions: def name(...) earlier in the file ----
        const defs = vars._defs;
        const fn = defs && defs[node.name];
        if (fn) {
          if ((vars._callDepth || 0) > 24) throw { runtime: true, msg: 'functions calling each other too deep' };
          vars._callDepth = (vars._callDepth || 0) + 1;
          // simple scoping: remember what the parameter names held, lend them
          // to the call, put them back after — good enough to TEACH with
          const saved = {};
          fn.params.forEach((pm, k) => {
            saved[pm] = Object.prototype.hasOwnProperty.call(vars, pm) ? vars[pm] : undefined;
            vars[pm] = a[k] !== undefined ? a[k] : 0;
          });
          let ret = 0;
          try { execBlock(fn.body, vars, { ops: 0, depth: 1 }); }
          catch (r) { if (r && r._return !== undefined) ret = r._return; else { vars._callDepth--; throw r; } }
          fn.params.forEach((pm) => {
            if (saved[pm] === undefined) delete vars[pm]; else vars[pm] = saved[pm];
          });
          vars._callDepth--;
          return ret;
        }
        throw { runtime: true, msg: "unknown function '" + node.name + "()'" };
      }
    }
    return 0;
  }

  function execBlock(stmts, vars, ctx) {
    for (let s = 0; s < stmts.length; s++) {
      if (++ctx.ops > 500000) throw { runtime: true, msg: 'code ran too long (possible infinite loop)' };
      const st = stmts[s];
      if (st.t === 'expr') {
        evalNode(st.expr, vars);
      } else if (st.t === 'assign') {
        const v = evalNode(st.expr, vars);
        if (st.op === '=') vars[st.name] = v;
        else {
          if (!Object.prototype.hasOwnProperty.call(vars, st.name)) throw { runtime: true, line: st.line, msg: "name '" + st.name + "' is not defined" };
          const cur = vars[st.name];
          vars[st.name] = st.op === '+=' ? cur + v : st.op === '-=' ? cur - v : st.op === '*=' ? cur * v : cur / v;
        }
      } else if (st.t === 'if') {
        for (let c = 0; c < st.clauses.length; c++) {
          const cl = st.clauses[c];
          if (cl.cond === null || truthy(evalNode(cl.cond, vars))) {
            // the live trace: which top-level if/elif/else branch fired this
            // step — the sensor windows show it so "why did my robot do that?"
            // has a visible answer (the line number in the team's own file)
            if (ctx.depth === 0 && vars._trace && cl.line) vars._trace.push(cl.line);
            ctx.depth++; execBlock(cl.body, vars, ctx); ctx.depth--;
            break;
          }
        }
      } else if (st.t === 'def') {
        if (!vars._defs) vars._defs = {};
        vars._defs[st.name] = { params: st.params, body: st.body };
      } else if (st.t === 'return') {
        throw { _return: st.expr ? evalNode(st.expr, vars) : 0 };
      } else if (st.t === 'while') {
        let guard = 0;
        ctx.depth++;
        while (truthy(evalNode(st.cond, vars))) { execBlock(st.body, vars, ctx); if (++guard > 20000) throw { runtime: true, msg: 'while loop ran too long' }; }
        ctx.depth--;
      }
    }
  }

  function compile(source) {
    let prog;
    try {
      const L = preprocess(source);
      if (L.length && L[0].indent !== 0) throw { line: L[0].line, msg: 'unexpected indentation' };
      const r = parseSuite(L, 0, L.length ? L[0].indent : 0);
      if (r[1] < L.length) throw { line: L[r[1]].line, msg: 'unexpected indentation' };
      prog = r[0];
    } catch (e) {
      throw new Error('Line ' + (e.line || '?') + ': ' + (e.msg || e.message || 'parse error'));
    }
    return {
      run(vars) {
        const hadHold = vars._holdSteps > 0;
        vars._trace = [];                       // branch lines taken this step
        try { execBlock(prog, vars, { ops: 0, depth: 0 }); }
        catch (e) { throw new Error((e.line ? 'Line ' + e.line + ': ' : '') + (e.msg || e.message || 'runtime error')); }
        // goto(x, y) in progress: steer along the straight A->B line every
        // step (navigation maths from the standalone sensors.js library)
        if (vars._gotoOn) {
          const NAV = (typeof RobotSensors !== 'undefined') ? RobotSensors.nav : null;
          if (NAV) {
            const pose = { x: vars.x / 100, y: vars.y / 100, heading: vars.heading * Math.PI / 180 };
            const out = NAV.driveTo(pose, vars._gotoX / 100, vars._gotoY / 100, { stopDist: 0.12, max: vars._gotoMax || 1 });
            if (out.arrived) { vars._gotoOn = 0; vars.atgoal = 1; vars.wheelleft = 0; vars.wheelright = 0; }
            else { vars.wheelleft = out.left * 25; vars.wheelright = out.right * 25; }
          }
        }
        // an easy move in progress overrides the wheels until its time is up
        if (vars._actSteps > 0) {
          const w = ACTIONS[vars._act];
          vars.wheelleft = w[0]; vars.wheelright = w[1];
          vars._actSteps--;
        }
        // movetime: "keep the wheels I just set for this many steps".
        // The countdown runs here automatically — same clock as timer
        // (10 steps = 1 s), so movetime = seconds(10) is exactly 10 s.
        if (hadHold) {
          vars.wheelleft = vars._holdL; vars.wheelright = vars._holdR;
          vars._holdSteps--;
          vars.movetime = vars._holdSteps;      // readable: steps remaining
        } else if (+vars.movetime > 0) {
          vars._holdSteps = Math.round(+vars.movetime);
          vars._holdL = vars.wheelleft; vars._holdR = vars.wheelright;
          vars.movetime = vars._holdSteps;
        }
      }
    };
  }

  const api = { compile };
  if (typeof root !== 'undefined') root.PyReader = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
