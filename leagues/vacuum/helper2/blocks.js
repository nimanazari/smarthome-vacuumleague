/* ============================================================
   leagues/vacuum/helper2/blocks.js — the Blocks helper (helper 2).

   Scratch-style rule stacks for First Step. THE DATA MODEL IS THE
   AI HELPER'S: both pages read and write the SAME rules file under
   the SAME storage key (shl_helper_<league>_rules), so a program
   started as blocks opens in the AI helper and back — nothing is
   translated, it IS one file with two views. Export/import moves
   that same file as .json ("the blocks file"); the Python writer
   produces the same movetime / nextmove code the AI helper writes,
   and pyreader runs it unchanged.

   فارسی: مدل داده‌ی این صفحه همان فایلِ قانون‌های هلپر ۱ است —
   یک فایل، دو نما. بلاک ⇆ هلپر ⇆ پایتون بدون هیچ ترجمه‌ای.
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const LEAGUE = Q.get('league') || 'fs';
  // the game's language choice rides along: English by default,
  // Persian (Vazirmatn) when the player switched in the burger menu
  let LANG = 'en';
  try { LANG = localStorage.getItem('shl_lang') || 'fa'; } catch (e) { /* private mode */ }
  if (LANG !== 'fa') LANG = 'en';
  const T = (fa, en) => (LANG === 'fa' ? fa : en);
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'fa' ? 'rtl' : 'ltr';
  const SAVE_KEY = 'shl_helper_' + LEAGUE + '_rules';   // THE shared file (helper 1's key)
  const HANDOFF_KEY = 'shl_helper_code';
  const GAME_URL = '../../../index.html';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const num1 = (n) => String(Math.round(n * 10) / 10);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---- the FS senses (the same rig kit.js declares).
     The distance parts are ULTRASONIC sensors — the rule reads
     "distance to the wall on that side", never an "eye". ---- */
  const SENSORS = {
    front: { kind: 'dist', ic: '📡', fa: 'سنسور فاصله — جلو', en: 'Ultrasonic — front', condFa: 'فاصله‌ی جلو', condEn: 'front distance', py: 'front' },
    frontleft: { kind: 'dist', ic: '📡', fa: 'سنسور فاصله — چپ', en: 'Ultrasonic — left', condFa: 'فاصله از دیوار چپ', condEn: 'distance to the LEFT wall', py: 'frontleft' },
    frontright: { kind: 'dist', ic: '📡', fa: 'سنسور فاصله — راست', en: 'Ultrasonic — right', condFa: 'فاصله از دیوار راست', condEn: 'distance to the RIGHT wall', py: 'frontright' },
    bumpfront: { kind: 'bump', ic: '🛡️', fa: 'سپر جلو', en: 'Bumper — front', condFa: 'سپر جلو خورد', condEn: 'front bumper pressed', py: 'bumperfront' },
    bumpback: { kind: 'bump', ic: '🛡️', fa: 'سپر عقب', en: 'Bumper — back', condFa: 'سپر عقب خورد', condEn: 'back bumper pressed', py: 'bumperback' },
    color: { kind: 'color', ic: '🎨', fa: 'سنسور رنگ', en: 'Colour sensor', condFa: 'رنگ کفِ جلو', condEn: 'floor colour ahead', py: 'color' },
  };
  const label = (o) => T(o.fa, o.en);
  const COLORS = [
    ['white', 'سفید (تمیز نشده)', 'white (not cleaned yet)'],
    ['green', 'سبز (فرش بزرگ)', 'green (the big rug)'],
    ['purple', 'بنفش (فرش کوچک)', 'purple (the small rug)'],
    ['black', 'سیاه (دیوار/مبل)', 'black (a wall / furniture)'],
    ['red', 'قرمز', 'red'], ['blue', 'آبی', 'blue'],
    ['orange', 'نارنجی (فرش نشانه)', 'orange (a marker rug)'],
    ['cyan', 'فیروزه‌ای (فرش نشانه)', 'cyan (a marker rug)'],
  ];
  /* ---- the moves, with the AI helper's exact wheel maths ---- */
  const curve = (s) => Math.max(1, Math.round(s * 0.32));
  const ACTS = {
    forward: { ic: '⬆️', fa: 'برو جلو', en: 'Drive forward', wheels: (s) => [s, s], def: 25 },
    back: { ic: '⬇️', fa: 'برو عقب', en: 'Straight back', wheels: (s) => [-s, -s], def: 25 },
    backright: { ic: '↘️', fa: 'عقبِ کج (راست)', en: 'Back away right', wheels: (s) => [-curve(s), -s], def: 25 },
    backleft: { ic: '↙️', fa: 'عقبِ کج (چپ)', en: 'Back away left', wheels: (s) => [-s, -curve(s)], def: 25 },
    turnright: { ic: '↩️', fa: 'بچرخ راست', en: 'Turn right', wheels: (s) => [s, -s], def: 18 },
    turnleft: { ic: '↪️', fa: 'بچرخ چپ', en: 'Turn left', wheels: (s) => [-s, s], def: 18 },
    stop: { ic: '🛑', fa: 'بایست', en: 'Stand still', wheels: () => [0, 0], def: 0 },
  };

  /* ================================================================
     THE FILE — helper 1's rules, loaded raw and saved back raw, so
     every field helper 1 knows (even ones this page does not show)
     survives the round trip.
     ================================================================ */
  let FILE = { drive: 25, rules: [] };
  function load() {
    try {
      const j = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (j && Array.isArray(j.rules)) FILE = j;
    } catch (e) { /* private mode */ }
    if (!FILE.drive) FILE.drive = 25;
  }
  function saveFile() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(FILE)); } catch (e) { /* private mode */ }
  }
  const newRule = () => ({
    members: [], cm: 60, colorPick: 'purple', act: 'backright', secs: 0.5, speed: 25,
    on: true, act2: null, secs2: 0.5, speed2: 18,
  });
  load();

  let sel = 0;                                   // index of the selected stack
  const R = () => FILE.rules;

  /* ================================================================
     THE PYTHON — the same movetime / nextmove file the AI helper
     writes: then-handlers first, one clause per rule, else = drive.
     ================================================================ */
  const cmt = (code, note) => {
    if (!note) return code;
    const n = code.length >= 30 ? 1 : 31 - code.length;
    return code + new Array(n + 1).join(' ') + '# ' + note;
  };
  function condOf(r) {
    return (r.members || []).map((id) => {
      const s = SENSORS[id];
      if (!s) return null;
      if (s.kind === 'dist') return s.py + ' < ' + (r.cm || 60);
      if (s.kind === 'bump') return s.py + ' == 1';
      return 'color == ' + (r.colorPick || 'purple');
    }).filter(Boolean).join(' and ');
  }
  function moveLines(act, speed, secs, extra) {
    const w = ACTS[act].wheels(clamp(Math.round(speed), 0, 25));
    const out = [
      cmt('    wheelleft = ' + w[0], LANG === 'fa' ? ACTS[act].fa : ACTS[act].en),
      '    wheelright = ' + w[1],
      cmt('    movetime = seconds(' + num1(secs) + ')', 'hold it for ' + num1(secs) + ' s'),
    ];
    if (extra) out.push(extra);
    return out;
  }
  function toPython() {
    const L = [];
    const P = (s) => L.push(s == null ? '' : s);
    const BAR = '# ============================================================';
    const cls = R().map((r, i) => ({ r, i: i + 1 })).filter((c) => c.r.on !== false && (c.r.members || []).length);
    P('# type: ignore');
    P('# cspell:ignore frontleft frontright bumperfront bumperback wheelleft wheelright movetime');
    P(BAR);
    P('#  MY ROBOT BRAIN  -  built from BLOCKS (helper 2)');
    P('#  The same rules open in the AI helper - one file, two views.');
    P('#  The game runs this 10x every second; the FIRST true rule wins,');
    P('#  and movetime = seconds(n) keeps the wheels for n seconds.');
    P(BAR);
    P('');
    P('# === EDITOR SETUP =========================================');
    P('# The game SKIPS this block - it only calms the code editor.');
    P('front = 200; frontleft = 200; frontright = 200');
    P('bumperfront = 0; bumperback = 0; bumper = 0');
    P('color = 0; movetime = 0; nextmove = 0');
    P('white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5; orange = 6; cyan = 7');
    P('wheelleft = 0; wheelright = 0');
    P('# === END EDITOR SETUP =====================================');
    P('');
    if (!cls.length) {
      P('# No block rule yet - the robot just drives straight ahead.');
      P(cmt('wheelleft = ' + FILE.drive, 'straight ahead - and every tile'));
      P(cmt('wheelright = ' + FILE.drive, 'I drive over turns my colour'));
      P('');
      return L.join('\n');
    }
    P('# ---------- MY BLOCK RULES, IN MY ORDER ----------');
    let kw = 'if ';
    const KW = () => { const k = kw; kw = 'elif '; return k; };
    // a rule's SECOND move runs first in the chain, like the AI helper
    cls.forEach((c) => {
      if (!c.r.act2) return;
      P(cmt(KW() + 'nextmove == ' + c.i + ' and movetime == 0:', 'rule ' + c.i + ', part two'));
      P('    nextmove = 0');
      moveLines(c.r.act2, c.r.speed2 || 18, c.r.secs2 || 0.5).forEach(P);
      P('');
    });
    cls.forEach((c) => {
      P(cmt(KW() + condOf(c.r) + ' and movetime == 0:', 'rule ' + c.i));
      moveLines(c.r.act, c.r.speed || 25, c.r.secs || 0.5,
        c.r.act2 ? cmt('    nextmove = ' + c.i, 'then do my second move') : null).forEach(P);
      P('');
    });
    P(cmt('else:', 'no rule fired'));
    P(cmt('    wheelleft = ' + FILE.drive, 'straight ahead - and every tile'));
    P(cmt('    wheelright = ' + FILE.drive, 'I drive over turns my colour'));
    P('');
    return L.join('\n');
  }

  /* ================================================================
     PYTHON → BLOCKS (reverse). The helpers write one dialect —
     `cond and movetime == 0:` clauses with wheel pairs, seconds()
     and nextmove — so that same dialect reads back into stacks:
     paste (or open) a .py and WATCH what it says, as blocks.
     ================================================================ */
  const PY_SENS = {};
  for (const id in SENSORS) PY_SENS[SENSORS[id].py] = id;
  function wheelsToAct(wl, wr) {
    if (wl === 0 && wr === 0) return { act: 'stop', speed: 0 };
    if (wl > 0 && wr > 0) return { act: 'forward', speed: Math.max(wl, wr) };
    if (wl > 0 && wr < 0) return { act: 'turnright', speed: wl };
    if (wl < 0 && wr > 0) return { act: 'turnleft', speed: wr };
    // both negative: straight back or a curve
    if (Math.abs(wl - wr) <= 1) return { act: 'back', speed: Math.abs(wl) };
    return Math.abs(wr) > Math.abs(wl)
      ? { act: 'backright', speed: Math.abs(wr) }
      : { act: 'backleft', speed: Math.abs(wl) };
  }
  function parsePython(text) {
    const lines = String(text).split(/\r?\n/).map((l) => l.replace(/#.*$/, '').replace(/\s+$/, ''));
    const out = { drive: 25, rules: [] };
    const thenMoves = {};                     // nextmove id -> move
    let cur = null, mode = null, curThen = null;
    const flush = () => { if (cur && cur.members.length) out.rules.push(cur); cur = null; };
    for (const raw of lines) {
      const l = raw.trim();
      if (!l) continue;
      let m;
      if ((m = l.match(/^(?:if|elif)\s+nextmove\s*==\s*(\d+)\s+and\s+movetime\s*==\s*0\s*:/))) {
        flush(); mode = 'then'; curThen = { id: +m[1], wl: 0, wr: 0, secs: 0.5 };
        thenMoves[curThen.id] = curThen; continue;
      }
      if ((m = l.match(/^(?:if|elif)\s+(.+?)\s+and\s+movetime\s*==\s*0\s*:/))) {
        flush(); mode = 'rule';
        cur = { members: [], cm: 60, colorPick: 'purple', act: 'forward', speed: 25, secs: 0.5, on: true, act2: null, secs2: 0.5, speed2: 18, wl: null, wr: null, next: null };
        for (const part of m[1].split(/\s+and\s+/)) {
          let c;
          if ((c = part.match(/^(\w+)\s*<\s*(\d+)$/)) && PY_SENS[c[1]]) { cur.members.push(PY_SENS[c[1]]); cur.cm = +c[2]; }
          else if ((c = part.match(/^(\w+)\s*==\s*1$/)) && PY_SENS[c[1]]) { cur.members.push(PY_SENS[c[1]]); }
          else if ((c = part.match(/^color\s*==\s*(\w+)$/))) { cur.members.push('color'); cur.colorPick = c[1]; }
        }
        continue;
      }
      if (l === 'else:') { flush(); mode = 'else'; continue; }
      const tgt = mode === 'then' ? curThen : mode === 'rule' ? cur : null;
      if ((m = l.match(/^wheelleft\s*=\s*(-?\d+)$/))) { if (tgt) tgt.wl = +m[1]; else if (mode === 'else') out.drive = Math.abs(+m[1]); continue; }
      if ((m = l.match(/^wheelright\s*=\s*(-?\d+)$/))) { if (tgt) tgt.wr = +m[1]; continue; }
      if ((m = l.match(/^movetime\s*=\s*seconds\(([\d.]+)\)$/))) { if (tgt) tgt.secs = +m[1]; continue; }
      if ((m = l.match(/^nextmove\s*=\s*(\d+)$/))) { if (mode === 'rule' && cur && +m[1] > 0) cur.next = +m[1]; continue; }
    }
    flush();
    out.rules.forEach((r, i) => {
      if (r.wl != null && r.wr != null) { const a = wheelsToAct(r.wl, r.wr); r.act = a.act; r.speed = a.speed || 1; }
      const tm = r.next != null ? thenMoves[r.next] : thenMoves[i + 1];
      if (tm && r.next != null) {
        const a2 = wheelsToAct(tm.wl, tm.wr);
        r.act2 = a2.act; r.speed2 = a2.speed || 18; r.secs2 = tm.secs;
      }
      delete r.wl; delete r.wr; delete r.next;
    });
    return out.rules.length ? out : null;
  }
  function loadPythonText(text) {
    const parsed = parsePython(text);
    if (!parsed) { toast(T('در این پایتون قانونی به سبک هلپر پیدا نشد', 'No helper-style rules found in that Python')); return; }
    FILE = parsed; sel = 0; refresh();
    toast(T(parsed.rules.length + ' قانون از پایتون خوانده شد', parsed.rules.length + ' rule' + (parsed.rules.length === 1 ? '' : 's') + ' read from the Python'));
  }

  /* ================================================================
     THE PALETTE
     ================================================================ */
  function buildPalette() {
    const ps = $('palSens');
    for (const id in SENSORS) {
      const s = SENSORS[id];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'blk sens';
      b.innerHTML = '<span class="bic">' + s.ic + '</span> ' + T('اگر ', 'if ') + esc(label(s)) +
        ' <span class="pyt" title="' + T('اسمش در پایتون', 'its Python name') + '">…</span><small style="display:none">' + esc(s.py) + '</small>';
      b.querySelector('.pyt').onclick = (ev) => {
        ev.stopPropagation();
        const sm = b.querySelector('small');
        sm.style.display = sm.style.display === 'none' ? '' : 'none';
      };
      b.onclick = () => {
        if (!R().length) addRule();
        const r = R()[sel];
        const i = r.members.indexOf(id);
        if (i >= 0) r.members.splice(i, 1); else { r.members.push(id); justAdded = 'cond:' + sel + ':' + id; }
        refresh();
      };
      ps.appendChild(b);
    }
    const pa = $('palActs');
    for (const id in ACTS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'blk move';
      b.innerHTML = '<span class="bic">' + ACTS[id].ic + '</span> ' + esc(label(ACTS[id]));
      b.onclick = () => {
        if (!R().length) addRule();
        const r = R()[sel];
        if (!r._slot2) { r.act = id; r.speed = ACTS[id].def; justAdded = 'move:' + sel + ':1'; }
        else { r.act2 = id; r.speed2 = ACTS[id].def || 18; justAdded = 'move:' + sel + ':2'; }
        refresh();
      };
      pa.appendChild(b);
    }
  }

  /* ================================================================
     THE STACKS
     ================================================================ */
  function numIn(val, min, max, step, set) {
    const i = document.createElement('input');
    i.type = 'text'; i.inputMode = 'decimal'; i.value = String(val);
    i.onclick = (e) => { e.stopPropagation(); i.select(); };
    i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } };
    i.onchange = () => {
      const v = parseFloat(String(i.value).replace(/[,٫]/g, '.'));
      if (isFinite(v)) set(step === 1 ? Math.round(clamp(v, min, max)) : Math.round(clamp(v, min, max) * 10) / 10);
      refresh();
    };
    return i;
  }
  let justAdded = null;                 // 'cond:<sel>:<id>' | 'move:<sel>:<1|2>'
  // one SNAPPED block row: pieces land in it with real gaps, never glued
  function chip(cls, onX) {
    const c = document.createElement('div');
    c.className = 'brow ' + cls;
    if (onX) {
      const x = document.createElement('span');
      x.className = 'x'; x.textContent = '×';
      x.title = T('حذف', 'remove');
      x.onclick = (e) => { e.stopPropagation(); onX(); refresh(); };
      c.appendChild(x);
    }
    return c;
  }
  const piece = (txt) => { const sp = document.createElement('span'); sp.className = 'pc'; sp.textContent = txt; return sp; };
  const kw = (txt) => { const sp = document.createElement('span'); sp.className = 'pc kw'; sp.textContent = txt; return sp; };
  function moveChip(r, two) {
    const act = two ? r.act2 : r.act;
    const c = chip('move' + (two ? ' move2' : ''), two ? () => { r.act2 = null; } : null);
    const at = (el) => c.insertBefore(el, c.querySelector('.x'));
    at(kw(two ? T('سپس', 'and then') : T('آنگاه', 'then')));
    at(piece(ACTS[act].ic + ' ' + label(ACTS[act])));
    if (act !== 'stop') {
      at(piece(T('با سرعت', 'at speed')));
      at(numIn(two ? (r.speed2 || 18) : (r.speed || 25), 1, 25, 1,
        (v) => { if (two) r.speed2 = v; else r.speed = v; }));
    }
    at(piece(T('برای', 'for')));
    at(numIn(two ? (r.secs2 || 0.5) : (r.secs || 0.5), 0.1, 6, 0.1,
      (v) => { if (two) r.secs2 = v; else r.secs = v; }));
    at(piece(T('ثانیه', 's')));
    if (justAdded === 'move:' + R().indexOf(r) + ':' + (two ? 2 : 1)) c.classList.add('pop');
    return c;
  }
  function drawStacks() {
    const box = $('stacks');
    box.innerHTML = '';
    R().forEach((r, i) => {
      const st = document.createElement('div');
      st.className = 'stack' + (i === sel ? ' sel' : '') + (r.on === false ? ' off' : '');
      st.onclick = () => { sel = i; refresh(); };

      const head = document.createElement('div');
      head.className = 'stkhead';
      head.innerHTML = '<span class="idx">' + (i + 1) + '</span><span class="word">' + T('اگر', 'if') + '</span>';
      const btns = document.createElement('span');
      btns.className = 'stkbtns';
      const mk = (t, title, fn, dis) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = t; b.title = title; b.disabled = !!dis;
        b.onclick = (e) => { e.stopPropagation(); fn(); refresh(); };
        btns.appendChild(b);
      };
      mk('↑', T('زودتر پرسیده شود', 'ask earlier'), () => { if (i > 0) { const t = R()[i]; R()[i] = R()[i - 1]; R()[i - 1] = t; sel = i - 1; } }, i === 0);
      mk('↓', T('دیرتر پرسیده شود', 'ask later'), () => { if (i < R().length - 1) { const t = R()[i]; R()[i] = R()[i + 1]; R()[i + 1] = t; sel = i + 1; } }, i === R().length - 1);
      mk(r.on === false ? '◻' : '☑', T('در فایل باشد یا نه', 'include in the file'), () => { r.on = r.on === false; });
      mk('×', T('حذف قانون', 'delete this rule'), () => { R().splice(i, 1); if (sel >= R().length) sel = Math.max(0, R().length - 1); });
      head.appendChild(btns);
      st.appendChild(head);

      // ONE snapped column: conditions, then the moves, tab into tab —
      // the keywords (if / and / then) live INSIDE the blocks, MindStack-style
      const col = document.createElement('div');
      col.className = 'stkcol';
      if (!(r.members || []).length) {
        col.innerHTML = '<span class="empty">' + T('از ستون بلاک‌ها یک حسگر بزن تا شرط این قانون شود…', 'Tap a sensor block on the left to make this rule\'s condition…') + '</span>';
      } else {
        r.members.forEach((id, mi) => {
          const s = SENSORS[id];
          if (!s) return;
          const c = chip('sens', () => { r.members.splice(r.members.indexOf(id), 1); });
          const at = (el) => c.insertBefore(el, c.querySelector('.x'));
          at(kw(mi === 0 ? T('اگر', 'if') : T('و', 'and')));
          at(piece(s.ic));
          if (s.kind === 'dist') {
            at(piece(T(s.condFa, s.condEn)));
            at(piece(T('کمتر از', 'closer than')));
            at(numIn(r.cm || 60, 5, 200, 1, (v) => { r.cm = v; }));
            at(piece(T('سانتی‌متر', 'cm')));
          } else if (s.kind === 'color') {
            at(piece(T(s.condFa, s.condEn)));
            at(piece('='));
            const selEl = document.createElement('select');
            COLORS.forEach(([v, fa, en]) => {
              const o = document.createElement('option');
              o.value = v; o.textContent = T(fa, en); if ((r.colorPick || 'purple') === v) o.selected = true;
              selEl.appendChild(o);
            });
            selEl.onclick = (e) => e.stopPropagation();
            selEl.onchange = () => { r.colorPick = selEl.value; refresh(); };
            at(selEl);
          } else {
            at(piece(T(s.condFa, s.condEn)));
          }
          if (justAdded === 'cond:' + i + ':' + id) c.classList.add('pop');
          col.appendChild(c);
        });
      }
      // just dropped a condition? ask what comes next, blinking
      if (justAdded && justAdded.indexOf('cond:' + i + ':') === 0) {
        const ask = document.createElement('div');
        ask.className = 'asknext';
        const q = document.createElement('span');
        q.textContent = T('حالا چی اضافه می‌کنی؟', 'What do you add next?');
        ask.appendChild(q);
        const mk = (label, palId) => {
          const b = document.createElement('button');
          b.type = 'button'; b.textContent = label;
          b.onclick = (ev) => {
            ev.stopPropagation();
            const pal = $(palId);
            pal.classList.remove('palglow'); void pal.offsetWidth;
            pal.classList.add('palglow');
            pal.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => pal.classList.remove('palglow'), 2400);
          };
          ask.appendChild(b);
          return b;
        };
        mk(T('یک شرط دیگر', 'another condition'), 'palSens');
        mk(T('یک دستور', 'a move'), 'palActs');
        col.appendChild(ask);
      }
      col.appendChild(moveChip(r, false));
      if (r.act2) col.appendChild(moveChip(r, true));
      else {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'addbtn slot2';
        b.textContent = r._slot2 ? T('حرکت دوم را از ستون بلاک‌ها بزن…', 'Tap a move block for step two…') : T('+ حرکت دوم', '+ second move');
        b.onclick = (e) => { e.stopPropagation(); sel = i; r._slot2 = !r._slot2; refresh(); };
        col.appendChild(b);
      }
      st.appendChild(col);
      if (r.act2) delete r._slot2;
      box.appendChild(st);
    });

    // the else stack — always there, always last
    const el = document.createElement('div');
    el.className = 'stack else';
    const h = document.createElement('div');
    h.className = 'stkhead';
    h.innerHTML = '<span class="idx">∞</span><span class="word">' + T('همیشه', 'always') + '</span><span class="hint">' + T('— وقتی هیچ قانونی صادق نیست', '— when no rule is true') + '</span>';
    el.appendChild(h);
    // "always" never connects UNDER anything — so it is a HAT block:
    // domed shoulders, NO notch cut into its top, and no tab below
    // (nothing ever snaps underneath it either)
    const col = document.createElement('div');
    col.className = 'stkcol';
    const c = chip('move hat');
    c.appendChild(kw(T('همیشه', 'always')));
    c.appendChild(piece(T('مستقیم برو، با سرعت', 'drive straight, at speed')));
    c.appendChild(numIn(FILE.drive, 1, 25, 1, (v) => { FILE.drive = v; }));
    col.appendChild(c);
    el.appendChild(col);
    box.appendChild(el);
  }

  function addRule() { FILE.rules.unshift(newRule()); sel = 0; }

  /* ================================================================
     WIRING
     ================================================================ */
  function refresh() {
    drawStacks();
    $('code').textContent = toPython();
    const n = R().filter((r) => r.on !== false && (r.members || []).length).length;
    $('barHint').textContent = T(
      R().length + ' قانون ساخته شده · ' + n + ' در فایل. همین قانون‌ها در هلپر AI هم باز می‌شوند.',
      R().length + ' rule' + (R().length === 1 ? '' : 's') + ' built · ' + n + ' in the file. The SAME rules open in the AI helper.');
    justAdded = null;
    saveFile();
  }
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.className = 'toast on';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.className = 'toast'; }, 2200);
  }

  $('addRule').onclick = () => { addRule(); refresh(); };
  $('resetBtn').onclick = () => { FILE = { drive: 25, rules: [] }; sel = 0; refresh(); toast(T('همه‌ی بلاک‌ها پاک شد', 'All blocks cleared')); };
  $('copyBtn').onclick = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(toPython()).then(() => toast(T('کپی شد', 'Copied')), () => toast(T('کپی نشد', 'Could not copy')));
  };
  const download = (text, name, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  $('dlPyBtn').onclick = () => download(toPython(), 'my-robot.py', 'text/x-python');
  $('dlJsonBtn').onclick = () => download(JSON.stringify(FILE, null, 2), 'my-robot.blocks.json', 'application/json');
  $('loadJsonBtn').onclick = () => $('jsonFile').click();
  // PYTHON → BLOCKS: open a .py, or paste one into the little modal
  $('loadPyBtn').onclick = () => {
    const ov = document.createElement('div');
    ov.id = 'pyModal';
    ov.innerHTML = '<div class="pym-card"><b>' + T('پایتون را اینجا بچسبان — بلاک می‌شود', 'Paste Python here — it becomes blocks') + '</b>' +
      '<textarea dir="ltr" spellcheck="false" placeholder="elif front < 75 and movetime == 0: ..."></textarea>' +
      '<div class="pym-row"><button type="button" class="btn ghost" id="pymFile">' + T('یا باز کردن فایل .py', 'or open a .py file') + '</button>' +
      '<span style="flex:1"></span>' +
      '<button type="button" class="btn ghost" id="pymCancel">' + T('انصراف', 'Cancel') + '</button>' +
      '<button type="button" class="btn go" id="pymGo">' + T('تبدیل به بلاک', 'To blocks') + '</button></div></div>';
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov);
    ov.querySelector('#pymCancel').onclick = () => ov.remove();
    ov.querySelector('#pymGo').onclick = () => { const t = ov.querySelector('textarea').value; ov.remove(); loadPythonText(t); };
    ov.querySelector('#pymFile').onclick = () => { ov.remove(); $('pyFile').click(); };
    ov.querySelector('textarea').focus();
  };
  $('pyFile').onchange = () => {
    const f = $('pyFile').files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => loadPythonText(rd.result);
    rd.readAsText(f);
  };
  $('jsonFile').onchange = () => {
    const f = $('jsonFile').files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result);
        if (!j || !Array.isArray(j.rules)) throw 0;
        FILE = j; sel = 0; refresh(); toast(T('فایل بلاکی بارگذاری شد', 'Blocks file loaded'));
      } catch (e) { toast(T('این فایل بلاکی نیست', 'Not a blocks file')); }
    };
    rd.readAsText(f);
  };
  $('playBtn').onclick = () => {
    try { localStorage.setItem(HANDOFF_KEY, toPython()); }
    catch (e) { toast(T('مرورگر اجازه‌ی ذخیره نداد', 'The browser blocked saving')); return; }
    location.href = GAME_URL + '?league=' + encodeURIComponent(LEAGUE) + '&helpercode=1';
  };
  $('playBtn2').onclick = () => {
    try { localStorage.setItem(HANDOFF_KEY + '_blue', toPython()); }
    catch (e) { toast(T('مرورگر اجازه‌ی ذخیره نداد', 'The browser blocked saving')); return; }
    location.href = GAME_URL + '?league=' + encodeURIComponent(LEAGUE) + '&helpercode=1';
  };
  $('backLink').href = GAME_URL + '?league=' + encodeURIComponent(LEAGUE);


  /* ---- dark / light: the same key as the AI helper ---- */
  const THEME_KEY = 'shl_helper_theme';
  function applyTheme(t) {
    document.body.classList.toggle('light', t === 'light');
    $('themeBtn').innerHTML = t === 'light' ? '&#127769;' : '&#9728;&#65039;';
  }
  let theme = null;
  try { theme = localStorage.getItem(THEME_KEY); } catch (e) { /* private mode */ }
  if (theme !== 'light' && theme !== 'dark') {
    theme = (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }
  applyTheme(theme);
  $('themeBtn').onclick = () => {
    theme = theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode */ }
    applyTheme(theme);
  };

  /* ---- static page copy, in the picked language ---- */
  const SET = (id, fa, en) => { const el = $(id); if (el) el.innerHTML = T(fa, en); };
  SET('uiTitle', 'Blocks — هلپر بلاکی', 'Blocks helper');
  SET('resetBtn', 'از نو', 'Start over');
  SET('backLink', '&#8594; برگرد به بازی', '&#8592; Back to the game');
  SET('loadPyBtn', '&#128229; پایتون &#8594; بلاک', '&#128229; Python &#8594; blocks');
  SET('h2Pal', '<span class="step">۱</span> بلاک‌ها', '<span class="step">1</span> Blocks');
  SET('palHint', 'روی بلاک بزن تا در قانونِ انتخاب‌شده بنشیند. شش‌ضلعی‌ها «شرط»اند، گردها «حرکت».',
      'Tap a block and it snaps into the selected rule. Hexagons are CONDITIONS, rounded ones are MOVES.');
  SET('palHeadSens', '🔶 اگر... (حسگرها)', '🔶 if… (sensors)');
  SET('palHeadActs', '🟦 آنگاه... (حرکت‌ها)', '🟦 then… (moves)');
  SET('h2Work', '<span class="step">۲</span> برنامه‌ی ربات <span class="hint">— ترتیبِ قانون‌ها همان ترتیبِ if / elif است</span>',
      '<span class="step">2</span> Your robot\'s program <span class="hint">— the rule order IS the if / elif order</span>');
  SET('addRule', '+ قانون جدید', '+ New rule');
  SET('h2Code', '<span class="step">۳</span> پایتونِ همین بلاک‌ها <span class="hint">— فایل واقعی‌ای که مسابقه اجرا می‌کند</span>',
      '<span class="step">3</span> The Python of these blocks <span class="hint">— the real file the match runs</span>');
  SET('copyBtn', 'کپی پایتون', 'Copy Python');
  SET('dlPyBtn', '&#11015; فایل پایتون', '&#11015; Python file');
  SET('dlJsonBtn', '&#11015; فایل بلاکی', '&#11015; Blocks file');
  SET('loadJsonBtn', '&#128229; بارگذاری فایل بلاکی', '&#128229; Load blocks file');
  SET('playBtn2', '&#9654; تیم ۲', '&#9654; Team 2');
  SET('playBtn', '&#9654; بازی با این کد', '&#9654; Play with this code');

  /* ---- go ---- */
  $('subTitle').textContent =
    /(^|-)fs$/.test(LEAGUE) ? 'First Step · Vacuum league' :
    /(^|-)u14$/.test(LEAGUE) ? 'U14 · Vacuum league' : LEAGUE;
  buildPalette();
  if (!R().length) addRule();
  refresh();
})();
