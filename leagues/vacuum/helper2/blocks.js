/* ============================================================
   leagues/vacuum/helper2/blocks.js — the Blocks helper (helper 2).

   A REAL Scratch-style editor for First Step and U14:
     · drag a puzzle block out of the palette (or tap it) and it snaps
       under the hat block or inside an "if … then" block
     · the yellow HAT "when the match starts" carries MY PLAN — moves
       done one after another, looping or not
     · every orange "if <hex> then" block is ONE RULE — its hexagons are
       the conditions, the blue blocks inside are what the robot does,
       block by block; rule order (top = asked first) IS the if/elif order
     · the Python of exactly those blocks is written live underneath

   THE DATA MODEL IS THE AI HELPER'S: both pages read and write the SAME
   rules file under the SAME storage key (shl_helper_<league>_rules), so
   a program started as blocks opens in the AI helper and back. This page
   adds `plan` (the hat's moves) and `moves` (a rule's block list) beside
   the fields helper 1 knows, so nothing is lost in either direction.

   THE ROAD BACK: any .py this page, the AI helper or the old 🧩 block app
   (fsapp) ever wrote reopens here — from its HELPER-STATE line when it
   has one, and by READING the Python itself when it does not.

   فارسی: بلوک‌ها را مثل اسکرچ بکش و بچین؛ همان فایل قانون‌های هلپر ۱
   ساخته می‌شود و خروجی، پایتونِ واقعی است. هر فایل پایتونی که هلپرها
   نوشته‌اند (حتی نسخه‌های قدیمی) دوباره همین‌جا بلوک می‌شود.
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const LEAGUE = Q.get('league') || 'fs';
  const U14 = /(^|-)u14$/.test(LEAGUE);
  // the game's language choice rides along: Persian by default
  let LANG = 'fa';
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

  /* ---- the team's own name: written into every file as "# TEAM:" ---- */
  const TEAM_KEY = 'shl_teamname_' + LEAGUE;
  let TEAM_NAME = '';
  try { TEAM_NAME = localStorage.getItem(TEAM_KEY) || ''; } catch (e) { /* private mode */ }
  const teamLine = () => (TEAM_NAME ? '# TEAM: ' + TEAM_NAME : '# TEAM:') + (MAP_NO ? '\n# MAP: ' + MAP_NO : '');
  /* ---- which competition map this program is for ----
     Picked next to the team name; written into the file as "# MAP: N" and
     into the file NAME as rN_team.py — the game shows the robot as RN_team. */
  const MAP_KEY = 'shl_mapno_' + LEAGUE;
  let MAP_NO = '';
  try { MAP_NO = localStorage.getItem(MAP_KEY) || ''; } catch (e) { /* private mode */ }
  (function wireMapNo() {
    const sel = document.getElementById('mapNoIn');
    if (!sel) return;
    sel.value = MAP_NO;
    sel.addEventListener('change', () => {
      MAP_NO = sel.value;
      try { localStorage.setItem(MAP_KEY, MAP_NO); } catch (e) { /* private mode */ }
      const box = document.getElementById('teamNameIn');
      if (box) box.dispatchEvent(new Event('input'));     // the preview redraws the way a name edit does
    });
  }());
  const pyFileName = (fallback) => {
    const nm = (TEAM_NAME || '').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, ' ');
    if (!nm) return fallback;
    return (MAP_NO ? 'r' + MAP_NO + '_' : '') + nm + '.py';
  };

  /* ================================================================
     THE VOCABULARY
     ================================================================ */
  // the senses (the same rig kit.js declares; U14 adds the compass, the
  // room number and the clean-% — the AI helper's exact U14 set)
  const SENSORS = [
    { id: 'front', kind: 'dist', py: 'front', ic: '📡', fa: 'فاصله‌ی جلو', en: 'front distance' },
    { id: 'frontleft', kind: 'dist', py: 'frontleft', ic: '📡', fa: 'فاصله از دیوار چپ', en: 'distance to the LEFT wall' },
    { id: 'frontright', kind: 'dist', py: 'frontright', ic: '📡', fa: 'فاصله از دیوار راست', en: 'distance to the RIGHT wall' },
    { id: 'bumpfront', kind: 'bump', py: 'bumperfront', ic: '🛡️', fa: 'سپر جلو خورد', en: 'front bumper pressed' },
    { id: 'bumpback', kind: 'bump', py: 'bumperback', ic: '🛡️', fa: 'سپر عقب خورد', en: 'back bumper pressed' },
    { id: 'color', kind: 'color', py: 'color', ic: '🎨', fa: 'رنگ کفِ جلو', en: 'floor colour ahead' },
  ];
  if (U14) {
    SENSORS.push(
      { id: 'compass', kind: 'compass', py: 'heading', ic: '🧭', fa: 'رو به', en: 'facing' },
      { id: 'room', kind: 'room', py: 'room', ic: '🚪', fa: 'در اتاقِ', en: 'in the' },
      { id: 'clean', kind: 'clean', py: 'clean', ic: '✨', fa: 'اتاقِ', en: 'the' });
  }
  const SENS = {};
  SENSORS.forEach((s) => { SENS[s.id] = s; });
  const PY_SENS = {};
  SENSORS.forEach((s) => { PY_SENS[s.py] = s.id; });
  PY_SENS.bumper = 'bumpfront';                    // the old app's "either half" reads as the front

  const COLORS = [
    ['white', 'سفید (تمیز نشده)', 'white (not cleaned yet)'],
    ['green', 'سبز (فرش بزرگ)', 'green (the big rug)'],
    ['purple', 'بنفش (فرش کوچک)', 'purple (the small rug)'],
    ['black', 'سیاه (دیوار/مبل)', 'black (a wall / furniture)'],
    ['red', 'قرمز', 'red'], ['blue', 'آبی', 'blue'],
    ['orange', 'نارنجی (فرش نشانه)', 'orange (a marker rug)'],
    ['cyan', 'فیروزه‌ای (فرش نشانه)', 'cyan (a marker rug)'],
  ];
  const COLOR_IDS = COLORS.map((c) => c[0]);
  const ROOMS = [[0, 'هال', 'hall'], [1, 'آشپزخانه', 'kitchen'], [2, 'خواب ۱', 'bedroom 1'], [3, 'خواب ۲', 'bedroom 2'], [4, 'خواب ۳', 'bedroom 3'], [5, 'سرویس', 'bathroom']];
  const DIRS = [[0, '→ راست', 'right →'], [90, '↑ بالا', 'up ↑'], [180, '← چپ', 'left ←'], [270, '↓ پایین', 'down ↓']];

  // the moves, with the AI helper's exact wheel maths
  const curve = (s) => Math.max(1, Math.round(s * 0.32));
  const ACTS = {
    forward: { ic: '⬆️', fa: 'برو جلو', en: 'drive forward', wheels: (s) => [s, s], def: 25, secs: 2 },
    back: { ic: '⬇️', fa: 'برو عقب', en: 'drive backward', wheels: (s) => [-s, -s], def: 25, secs: 1 },
    turnright: { ic: '↪️', fa: 'بچرخ راست', en: 'turn right', wheels: (s) => [s, -s], def: 18, secs: 1 },
    turnleft: { ic: '↩️', fa: 'بچرخ چپ', en: 'turn left', wheels: (s) => [-s, s], def: 18, secs: 1 },
    backright: { ic: '↘️', fa: 'عقبِ کج (راست)', en: 'back away right', wheels: (s) => [-curve(s), -s], def: 25, secs: 0.5 },
    backleft: { ic: '↙️', fa: 'عقبِ کج (چپ)', en: 'back away left', wheels: (s) => [-s, -curve(s)], def: 25, secs: 0.5 },
    stop: { ic: '🛑', fa: 'بایست', en: 'stand still', wheels: () => [0, 0], def: 0, secs: 1 },
  };
  const ACT_IDS = ['forward', 'back', 'turnright', 'turnleft', 'backright', 'backleft', 'stop'];
  const actName = (id) => T(ACTS[id].fa, ACTS[id].en);
  const wheelsOf = (m) => ACTS[m.act].wheels(clamp(Math.round(m.speed), 0, 25));

  /* ================================================================
     THE FILE
       { drive, loop, plan: [move], rules: [rule] }
       move = { act, secs, speed }
       rule = { members, cm, colorPick, dir, roomPick, cleanRoom, cleanPct,
                on, moves: [move], + act/act2/act3 mirrors for helper 1 }
     ================================================================ */
  const mkMove = (act, secs, speed) => ({
    act: ACTS[act] ? act : 'forward',
    secs: clamp(Math.round((isFinite(+secs) && +secs > 0 ? +secs : ACTS[act] ? ACTS[act].secs : 1) * 10) / 10, 0.1, 10),
    speed: clamp(Math.round(isFinite(+speed) ? +speed : (ACTS[act] ? ACTS[act].def : 18)), 0, 25),
  });
  function normMove(m) {
    if (!m || typeof m !== 'object') return null;
    let act = m.act;
    if (act === 'turnto') act = 'turnright';                 // helper 1's compass turn: the nearest block
    if (act === 'backward') act = 'back';                     // the old app's name
    if (!ACTS[act]) return null;
    return mkMove(act, m.secs, m.speed == null ? ACTS[act].def : m.speed);
  }
  function newRule(members) {
    return {
      members: members || [], cm: 60, colorPick: 'purple', dir: 90, roomPick: 2, cleanRoom: 2, cleanPct: 80,
      on: true, moves: [mkMove('backright', 0.5, 25)],
    };
  }
  // strict: a rule with no sense this page knows is dropped (a foreign
  // division's file); lax: kept empty, the child is still building it
  function normRule(s, strict) {
    if (!s || typeof s !== 'object') return null;
    const members = [];
    (Array.isArray(s.members) ? s.members : []).forEach((id) => { if (SENS[id] && members.indexOf(id) < 0) members.push(id); });
    if (strict && !members.length) return null;
    const r = newRule(members);
    if (isFinite(+s.cm)) r.cm = clamp(Math.round(+s.cm), 5, 200);
    if (COLOR_IDS.indexOf(s.colorPick) >= 0) r.colorPick = s.colorPick;
    if (isFinite(+s.dir)) r.dir = ((Math.round(+s.dir) % 360) + 360) % 360;
    if (isFinite(+s.roomPick)) r.roomPick = clamp(Math.round(+s.roomPick), 0, 5);
    if (isFinite(+s.cleanRoom)) r.cleanRoom = clamp(Math.round(+s.cleanRoom), 1, 5);
    if (isFinite(+s.cleanPct)) r.cleanPct = clamp(Math.round(+s.cleanPct), 5, 99);
    if (s.on === false) r.on = false;
    let moves = [];
    if (Array.isArray(s.moves)) moves = s.moves.map(normMove).filter(Boolean);
    else {
      // helper 1's shape: act / act2 / act3
      [['act', 'secs', 'speed'], ['act2', 'secs2', 'speed2'], ['act3', 'secs3', 'speed3']].forEach((k) => {
        if (s[k[0]]) { const m = normMove({ act: s[k[0]], secs: s[k[1]], speed: s[k[2]] }); if (m) moves.push(m); }
      });
    }
    r.moves = moves;
    return r;
  }
  function normFile(j, strict) {
    const f = { drive: 25, loop: true, plan: [], rules: [] };
    if (!j || typeof j !== 'object') return f;
    if (isFinite(+j.drive) && +j.drive > 0) f.drive = clamp(Math.round(+j.drive), 1, 25);
    if (j.loop === false) f.loop = false;
    (Array.isArray(j.plan) ? j.plan : []).forEach((m) => { const x = normMove(m); if (x) f.plan.push(x); });
    (Array.isArray(j.rules) ? j.rules : []).forEach((s) => { const r = normRule(s, strict); if (r) f.rules.push(r); });
    return f;
  }
  // the file as it is saved: this page's fields PLUS helper 1's mirrors
  function modelOut() {
    return {
      drive: FILE.drive, loop: FILE.loop,
      plan: FILE.plan.map((m) => ({ act: m.act, secs: m.secs, speed: m.speed })),
      rules: FILE.rules.map((r) => {
        const o = {
          members: r.members.slice(), cm: r.cm, colorPick: r.colorPick, dir: r.dir,
          roomPick: r.roomPick, cleanRoom: r.cleanRoom, cleanPct: r.cleanPct, on: r.on,
          moves: r.moves.map((m) => ({ act: m.act, secs: m.secs, speed: m.speed })),
          act: null, secs: 0.5, speed: 25, act2: null, secs2: 0.5, speed2: 18, act3: null, secs3: 0.5, speed3: 18,
        };
        const m1 = r.moves[0], m2 = r.moves[1], m3 = r.moves[2];
        if (m1) { o.act = m1.act; o.secs = m1.secs; o.speed = m1.speed; }
        if (m2) { o.act2 = m2.act; o.secs2 = m2.secs; o.speed2 = m2.speed; }
        if (m3) { o.act3 = m3.act; o.secs3 = m3.secs; o.speed3 = m3.speed; }
        return o;
      }),
    };
  }
  // the old 🧩 block app's model: a strip of moves and "when" reactions
  function fromFsapp(m) {
    const f = { drive: 25, loop: m.loop !== false, plan: [], rules: [] };
    (Array.isArray(m.blocks) ? m.blocks : []).forEach((b) => {
      if (!b) return;
      const mv = normMove({ act: b.act, secs: b.secs });
      if (!mv) return;
      if (b.t === 'move') { f.plan.push(mv); return; }
      if (b.t !== 'when') return;
      const r = newRule([]);
      if (b.cond === 'wall') { r.members = ['front']; r.cm = 45; }
      else if (b.cond === 'bump') r.members = ['bumpfront'];
      else if (b.cond === 'color') { r.members = ['color']; if (COLOR_IDS.indexOf(b.color) >= 0) r.colorPick = b.color; }
      else return;
      r.moves = [mv];
      f.rules.push(r);
    });
    return f;
  }
  // any helper's HELPER-STATE → this page's file (null = not ours)
  function fileFromState(j) {
    if (!j || !j.model) return null;
    if (j.app === 'fsapp') return Array.isArray(j.model.blocks) ? fromFsapp(j.model) : null;
    if (j.app === 'blocks' || j.app === 'helper') return Array.isArray(j.model.rules) ? normFile(j.model, true) : null;
    return null;
  }

  let FILE = normFile(null);
  function load() {
    let j = null;
    try { j = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { /* private mode */ }
    FILE = normFile(j, false);
  }
  function saveFile() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(modelOut())); } catch (e) { /* private mode */ }
  }
  const isEmptyFile = (f) => !f.plan.length && !f.rules.some((r) => r.members.length);

  /* ---- HELPER-STATE: the road back from Python ---- */
  function stateEncode(app, model) {
    const json = JSON.stringify({ app: app, league: LEAGUE, v: 2, model: model });
    return '# HELPER-STATE shl1:' + btoa(unescape(encodeURIComponent(json)));
  }
  function stateDecode(text) {
    const all = String(text || '').match(/#[ \t]*HELPER-STATE[ \t]+shl1:[A-Za-z0-9+/=]+/g);
    if (!all || !all.length) return null;
    const b64 = all[all.length - 1].split('shl1:')[1];
    try { return JSON.parse(decodeURIComponent(escape(atob(b64)))); } catch (e) { return null; }
  }

  /* ================================================================
     THE PYTHON — then-parts first, one clause per rule, else = the plan
     ================================================================ */
  const cmt = (code, note) => {
    if (!note) return code;
    const n = code.length >= 34 ? 1 : 35 - code.length;
    return code + new Array(n + 1).join(' ') + '# ' + note;
  };
  function condOf(r) {
    return r.members.map((id) => {
      const s = SENS[id];
      if (!s) return null;
      if (s.kind === 'dist') return s.py + ' < ' + r.cm;
      if (s.kind === 'bump') return s.py + ' == 1';
      if (s.kind === 'color') return 'color == ' + r.colorPick;
      if (s.kind === 'compass') {
        return r.dir === 0 ? '(heading < 45 or heading > 315)'
          : '(heading > ' + (r.dir - 45) + ' and heading < ' + (r.dir + 45) + ')';
      }
      if (s.kind === 'room') return 'room == ' + r.roomPick;
      if (s.kind === 'clean') return 'clean' + r.cleanRoom + ' > ' + r.cleanPct;
      return null;
    }).filter(Boolean).join(' and ');
  }
  function moveLines(m, ind, extra) {
    const w = wheelsOf(m);
    const out = [
      cmt(ind + 'wheelleft = ' + w[0], actName(m.act)),
      ind + 'wheelright = ' + w[1],
      cmt(ind + 'movetime = seconds(' + num1(m.secs) + ')', T('برای ' + num1(m.secs) + ' ثانیه', 'hold it for ' + num1(m.secs) + ' s')),
    ];
    if (extra) out.push(extra);
    return out;
  }
  const ticks = (s) => Math.max(1, Math.round(s * 10));
  // a rule's steps after the first ride on nextmove: step 2 = the rule's
  // own number (helper 1's convention), step k>2 = rule*100 + k
  const stepCode = (i, k) => (k === 2 ? i : i * 100 + k);
  function toPython() {
    const L = [];
    const P = (s) => L.push(s == null ? '' : s);
    const BAR = '# ============================================================';
    const live = FILE.rules.map((r, i) => ({ r, i: i + 1 })).filter((c) => c.r.on !== false && c.r.members.length && c.r.moves.length);
    P(teamLine());
    P('# type: ignore');
    P('# cspell:ignore frontleft frontright bumperfront bumperback wheelleft wheelright movetime nextmove');
    P(BAR);
    P('#  MY ROBOT BRAIN  -  built from BLOCKS (helper 2)');
    P('#  The same rules open in the AI helper - one file, two views.');
    P('#  The game runs this 10x every second; the FIRST true rule wins,');
    P('#  movetime = seconds(n) keeps the wheels for n seconds, and MY PLAN');
    P('#  (the hat block) runs whenever no rule is busy.');
    P(BAR);
    P('');
    P('# === EDITOR SETUP =========================================');
    P('# The game SKIPS this block - it only calms the code editor.');
    P('front = 200; frontleft = 200; frontright = 200');
    P('bumperfront = 0; bumperback = 0; bumper = 0');
    P('color = 0; movetime = 0; nextmove = 0; timer = 0; state = 0');
    P('white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5; orange = 6; cyan = 7');
    if (U14) P('heading = 0; room = 0; clean1 = 0; clean2 = 0; clean3 = 0; clean4 = 0; clean5 = 0');
    P('wheelleft = 0; wheelright = 0');
    P('# === END EDITOR SETUP =====================================');
    P('');
    let kw = 'if ';
    const KW = () => { const k = kw; kw = 'elif '; return k; };
    if (live.length) {
      P('# ---------- MY BLOCK RULES, IN MY ORDER ----------');
      // the later steps of every rule come first, like the AI helper
      live.forEach((c) => {
        for (let k = 2; k <= c.r.moves.length; k++) {
          P(cmt(KW() + 'nextmove == ' + stepCode(c.i, k) + ' and movetime == 0:', 'rule ' + c.i + ', step ' + k));
          P('    nextmove = ' + (k < c.r.moves.length ? stepCode(c.i, k + 1) : 0));
          moveLines(c.r.moves[k - 1], '    ').forEach(P);
          P('');
        }
      });
      live.forEach((c) => {
        P(cmt(KW() + condOf(c.r) + ' and movetime == 0:', 'rule ' + c.i));
        moveLines(c.r.moves[0], '    ',
          c.r.moves.length > 1 ? cmt('    nextmove = ' + stepCode(c.i, 2), 'then step 2') : null).forEach(P);
        P('');
      });
    }
    // ---- MY PLAN: the hat block ----
    let ind = '';
    if (!FILE.plan.length) {
      if (live.length) { P(cmt('else:', 'no rule fired')); ind = '    '; }
      else P('# No block rule yet - the robot just drives straight ahead.');
      P(cmt(ind + 'wheelleft = ' + FILE.drive, 'straight ahead - and every tile'));
      P(cmt(ind + 'wheelright = ' + FILE.drive, 'I drive over turns my colour'));
    } else {
      const n = FILE.plan.length;
      P('# ---------- MY PLAN: the hat block, one move after another ----------');
      if (live.length) { P(cmt('else:', 'no rule fired -> back to my plan')); ind = '    '; }
      P(cmt(ind + 'if movetime == 0:', 'the plan waits while a rule is busy'));
      ind += '    ';
      P(cmt(ind + 'if timer > 0:', 'still in the middle of a job'));
      P(cmt(ind + '    timer = timer - 1', 'count one off (10 = 1 second)'));
      P(cmt(ind + 'if timer == 0:', 'time is up -> the next job'));
      P(ind + '    state = state + 1');
      P(cmt(ind + '    if state > ' + n + ':', FILE.loop ? 'after the last one, start again' : 'after the last one, we are done'));
      P(ind + '        state = ' + (FILE.loop ? 1 : n + 1));
      FILE.plan.forEach((m, k) => {
        const w = wheelsOf(m);
        P(cmt(ind + (k ? 'elif' : 'if') + ' state == ' + (k + 1) + ':', (k + 1) + ') ' + actName(m.act)));
        P(ind + '    wheelleft = ' + w[0]);
        P(ind + '    wheelright = ' + w[1]);
        P(cmt(ind + '    if timer == 0:', 'has it just started?'));
        P(cmt(ind + '        timer = ' + ticks(m.secs), num1(m.secs) + ' s = ' + ticks(m.secs) + ' steps'));
      });
      if (!FILE.loop) {
        P(cmt(ind + 'else:', 'every job is done - stand still'));
        P(ind + '    wheelleft = 0');
        P(ind + '    wheelright = 0');
      }
    }
    P('');
    P('# --- Keep the next line. It lets the helper reopen this file so you\n#     can carry on building. It stores what the HELPER built, so if\n#     you edit the Python below by hand, those edits are yours alone\n#     and will not come back with it. ---');
    P('# --- خط بعدی را پاک نکنید. با آن، هلپر همین فایل را دوباره باز می‌کند\n#     تا ادامه بدهید. آنچه ذخیره می‌شود ساخته‌ی هلپر است؛ پس اگر\n#     پایتونِ پایین را با دست تغییر بدهید، آن تغییرها با فایل\n#     برنمی‌گردند. ---');
    P(stateEncode('blocks', modelOut()));
    P('');
    return L.join('\n');
  }

  /* ================================================================
     PYTHON → BLOCKS by READING the code (no HELPER-STATE needed).
     Understands every dialect the helpers ever wrote:
       · `if cond and movetime == 0:` + wheels + seconds() + nextmove  (helpers)
       · `if cond:` + forward(2) / backward(1) … easy moves            (old app)
       · `if state == k:` + wheels + timer = N                          (old app's plan)
       · `else:` + wheels                                               (the drive)
     ================================================================ */
  const EASY = { forward: [25, 25], backward: [-25, -25], turnleft: [-18, 18], turnright: [18, -18], stop: [0, 0] };
  function wheelsToMove(wl, wr, secs) {
    let act, speed;
    if (wl === 0 && wr === 0) { act = 'stop'; speed = 0; }
    else if (wl > 0 && wr > 0) { act = 'forward'; speed = Math.max(wl, wr); }
    else if (wl > 0 && wr < 0) { act = 'turnright'; speed = wl; }
    else if (wl < 0 && wr > 0) { act = 'turnleft'; speed = wr; }
    else if (Math.abs(wl - wr) <= 1) { act = 'back'; speed = Math.abs(wl); }
    else if (Math.abs(wr) > Math.abs(wl)) { act = 'backright'; speed = Math.abs(wr); }
    else { act = 'backleft'; speed = Math.abs(wl); }
    return mkMove(act, secs, speed);
  }
  function parseCond(str, r) {
    let s = ' ' + str + ' ';
    s = s.replace(/\(\s*heading\s*<\s*45\s+or\s+heading\s*>\s*315\s*\)/, () => {
      if (SENS.compass) { r.members.push('compass'); r.dir = 0; }
      return ' TRUE ';
    });
    s = s.replace(/\(\s*heading\s*>\s*(\d+)\s+and\s+heading\s*<\s*(\d+)\s*\)/, (_, a, b) => {
      if (SENS.compass) { r.members.push('compass'); r.dir = ((Math.round((+a + +b) / 2) % 360) + 360) % 360; }
      return ' TRUE ';
    });
    const add = (id) => { if (SENS[id] && r.members.indexOf(id) < 0) r.members.push(id); };
    s.split(/\s+and\s+/).forEach((part) => {
      const p = part.trim().replace(/^\(+|\)+$/g, '');
      let c;
      if (!p || p === 'TRUE' || /^movetime\s*==\s*0$/.test(p)) return;
      if ((c = p.match(/^(\w+)\s*<=?\s*(\d+)$/)) && PY_SENS[c[1]] && SENS[PY_SENS[c[1]]].kind === 'dist') { add(PY_SENS[c[1]]); r.cm = clamp(+c[2], 5, 200); }
      else if ((c = p.match(/^(\w+)\s*(?:==\s*1|>\s*0)$/)) && PY_SENS[c[1]] && SENS[PY_SENS[c[1]]].kind === 'bump') add(PY_SENS[c[1]]);
      else if ((c = p.match(/^color\s*==\s*(\w+)$/)) && COLOR_IDS.indexOf(c[1]) >= 0) { add('color'); r.colorPick = c[1]; }
      else if ((c = p.match(/^room\s*==\s*(\d)$/))) { add('room'); r.roomPick = clamp(+c[1], 0, 5); }
      else if ((c = p.match(/^clean(\d)\s*>=?\s*(\d+)$/))) { add('clean'); r.cleanRoom = clamp(+c[1], 1, 5); r.cleanPct = clamp(+c[2], 5, 99); }
    });
    return r.members.length > 0;
  }
  function parsePython(text) {
    const lines = String(text || '').split(/\r?\n/).map((l) => l.replace(/#.*$/, '').replace(/\s+$/, ''));
    const out = { drive: 25, loop: true, plan: [], rules: [] };
    const thenBy = {};                          // nextmove code -> { wl, wr, secs, next }
    const steps = {};                           // plan state -> { wl, wr, secs }
    let cur = null, mode = null, sawState = false, curIndent = -1;
    const rules = [];
    for (const raw of lines) {
      const l = raw.trim();
      if (!l) continue;
      const indent = raw.length - raw.replace(/^\s+/, '').length;
      let m;
      if ((m = l.match(/^(?:if|elif)\s+nextmove\s*==\s*(\d+)\s+and\s+movetime\s*==\s*0\s*:/))) {
        cur = thenBy[+m[1]] = { wl: null, wr: null, secs: 0.5, next: 0, easy: null }; mode = 'then'; curIndent = indent; continue;
      }
      if ((m = l.match(/^(?:if|elif)\s+state\s*==\s*(\d+)\s*:/))) {
        cur = steps[+m[1]] = { wl: null, wr: null, secs: 1 }; mode = 'step'; sawState = true; curIndent = indent; continue;
      }
      if (/^(?:if|elif)\s+(?:timer|movetime)\s*[<>=!]/.test(l) || /^(?:if|elif)\s+state\s*>/.test(l)) {
        // plumbing: NESTED inside the current block it belongs to it (a step's
        // own "if timer == 0"); at the block's level or above, the block is over
        if (indent <= curIndent) { cur = null; mode = null; curIndent = -1; }
        continue;
      }
      if ((m = l.match(/^(?:if|elif)\s+(.+?)\s*:$/))) {
        const r = newRule([]);
        r.moves = [];
        if (parseCond(m[1], r)) { cur = { rule: r, wl: null, wr: null, secs: 0.5, next: 0, easy: null }; rules.push(cur); mode = 'rule'; curIndent = indent; }
        else { cur = null; mode = null; curIndent = -1; }
        continue;
      }
      if (l === 'else:') { cur = null; mode = 'else'; curIndent = -1; continue; }
      if (/^(?:while|def)\b/.test(l)) { cur = null; mode = null; curIndent = -1; continue; }
      if ((m = l.match(/^wheelleft\s*=\s*(-?\d+)$/))) {
        if (cur) cur.wl = +m[1]; else if (mode === 'else' && !sawState && +m[1] > 0) out.drive = clamp(+m[1], 1, 25);
        continue;
      }
      if ((m = l.match(/^wheelright\s*=\s*(-?\d+)$/))) { if (cur) cur.wr = +m[1]; continue; }
      if ((m = l.match(/^movetime\s*=\s*seconds\(\s*([\d.]+)\s*\)$/))) { if (cur) cur.secs = +m[1]; continue; }
      if ((m = l.match(/^timer\s*=\s*(\d+)$/))) { if (cur && mode === 'step') cur.secs = Math.max(0.1, +m[1] / 10); continue; }
      if ((m = l.match(/^nextmove\s*=\s*(\d+)$/))) { if (cur && mode !== 'step') cur.next = +m[1]; continue; }
      if ((m = l.match(/^(forward|backward|turnleft|turnright|stop)\(\s*([\d.]*)\s*\)$/))) {
        if (cur) { cur.easy = m[1]; cur.secs = +m[2] > 0 ? +m[2] : 1; }
        continue;
      }
      if ((m = l.match(/^state\s*=\s*(\d+)$/))) { if (mode !== 'rule' && mode !== 'then') out.loop = +m[1] === 1; continue; }
    }
    const toMove = (x) => {
      if (x.easy) { const w = EASY[x.easy]; return wheelsToMove(w[0], w[1], x.secs); }
      if (x.wl == null || x.wr == null) return null;
      return wheelsToMove(x.wl, x.wr, x.secs);
    };
    rules.forEach((c) => {
      const first = toMove(c);
      if (first) c.rule.moves.push(first);
      let next = c.next, guard = 0;
      while (next > 0 && thenBy[next] && guard++ < 12) {
        const t = thenBy[next];
        const mv = toMove(t);
        if (mv) c.rule.moves.push(mv);
        next = t.next;
      }
      if (!c.rule.moves.length) c.rule.moves.push(mkMove('backright', 0.5, 25));
      out.rules.push(c.rule);
    });
    Object.keys(steps).map(Number).sort((a, b) => a - b).forEach((k) => {
      const mv = toMove(steps[k]);
      if (mv) out.plan.push(mv);
    });
    if (!sawState) out.loop = true;
    return (out.rules.length || out.plan.length) ? normFile(out, true) : null;
  }
  // a whole .py text → a file, by the state line first, by reading second
  function fileFromText(text) {
    const j = stateDecode(text);
    if (j) {
      if (j.league && j.league !== LEAGUE && (j.app === 'blocks' || j.app === 'helper')) return { foreign: j.league };
      const f = fileFromState(j);
      if (f) return { file: f };
    }
    const f = parsePython(text);
    return f ? { file: f } : null;
  }

  /* ================================================================
     THE EDITOR
     ================================================================ */
  let sel = { where: 'plan', ri: 0 };          // where a TAPPED palette block lands
  let DRAG = null;                              // what is in the air right now
  let lastAdded = null;                         // 'move:plan:2' | 'move:rule:0:1' | 'cond:0:front'
  let undoFile = null;                          // one level, for imports and "start over"
  const R = () => FILE.rules;

  /* ---- shared little pieces ---- */
  const piece = (txt, cls) => { const sp = document.createElement('span'); sp.className = 'pc' + (cls ? ' ' + cls : ''); sp.textContent = txt; return sp; };
  // an input never starts a drag of the block it sits in
  function noDrag(el) {
    el.addEventListener('pointerenter', () => { const b = el.closest('[draggable]'); if (b) b.draggable = false; });
    el.addEventListener('pointerleave', () => { const b = el.closest('[draggable]'); if (b) b.draggable = true; });
    el.addEventListener('click', (e) => e.stopPropagation());
    return el;
  }
  function numIn(val, min, max, step, set) {
    const i = document.createElement('input');
    i.type = 'text'; i.inputMode = 'decimal'; i.className = 'num'; i.value = String(val);
    i.onfocus = () => i.select();
    i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } };
    i.onchange = () => {
      const v = parseFloat(String(i.value).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0)).replace(/[,٫]/g, '.'));
      if (isFinite(v)) set(step === 1 ? Math.round(clamp(v, min, max)) : Math.round(clamp(v, min, max) * 10) / 10);
      refresh();
    };
    return noDrag(i);
  }
  function selIn(options, val, set) {
    const s = document.createElement('select');
    s.className = 'num';
    options.forEach((o) => {
      const op = document.createElement('option');
      op.value = String(o[0]); op.textContent = T(o[1], o[2]);
      if (String(val) === String(o[0])) op.selected = true;
      s.appendChild(op);
    });
    s.onchange = () => { set(s.value); refresh(); };
    return noDrag(s);
  }
  function xBtn(fn) {
    const x = document.createElement('span');
    x.className = 'x'; x.textContent = '×'; x.title = T('حذف', 'remove');
    x.onclick = (e) => { e.stopPropagation(); fn(); refresh(); };
    return x;
  }

  /* ---- a MOVE block (blue, stackable) ---- */
  function moveBlock(m, opts) {
    const b = document.createElement('div');
    b.className = 'blk motion stk';
    b.appendChild(piece(ACTS[m.act].ic, 'ic'));
    b.appendChild(piece(actName(m.act)));
    if (opts.live) {
      if (m.act !== 'stop') {
        b.appendChild(piece(T('با سرعت', 'at speed')));
        b.appendChild(numIn(m.speed, 1, 25, 1, (v) => { m.speed = v; }));
      }
      b.appendChild(piece(T('برای', 'for')));
      b.appendChild(numIn(m.secs, 0.1, 10, 0.1, (v) => { m.secs = v; }));
      b.appendChild(piece(T('ثانیه', 's')));
      b.appendChild(xBtn(opts.remove));
      b.draggable = true;
      b.ondragstart = (e) => dragStart(e, { src: 'ws', kind: 'move', where: opts.where, ri: opts.ri, mi: opts.mi }, b);
      b.onclick = (e) => { e.stopPropagation(); sel = { where: opts.where, ri: opts.ri }; markSel(); };
      if (lastAdded === 'move:' + opts.where + ':' + (opts.where === 'rule' ? opts.ri + ':' : '') + opts.mi) b.classList.add('pop');
    } else {
      // the palette copy: a hint of the numbers, the real ones appear once placed
      b.appendChild(piece(T('برای', 'for')));
      b.appendChild(piece(num1(ACTS[m.act].secs), 'num'));
      b.appendChild(piece(T('ثانیه', 's')));
      b.draggable = true;
      b.ondragstart = (e) => dragStart(e, { src: 'pal', kind: 'move', id: m.act }, b);
      b.onclick = () => { tapMove(m.act); };
      b.tabIndex = 0;
      b.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapMove(m.act); } };
    }
    return b;
  }

  /* ---- a CONDITION hexagon ---- */
  function hexChip(id, r, ri) {
    const s = SENS[id];
    const h = document.createElement('div');
    h.className = 'hex';
    h.appendChild(piece(s.ic, 'ic'));
    const live = !!r;
    if (s.kind === 'dist') {
      h.appendChild(piece(T(s.fa, s.en)));
      h.appendChild(piece(T('کمتر از', 'closer than')));
      h.appendChild(live ? numIn(r.cm, 5, 200, 1, (v) => { r.cm = v; }) : piece('60', 'num'));
      h.appendChild(piece(T('سانتی‌متر', 'cm')));
    } else if (s.kind === 'bump') {
      h.appendChild(piece(T(s.fa, s.en)));
    } else if (s.kind === 'color') {
      h.appendChild(piece(T(s.fa, s.en)));
      h.appendChild(piece('='));
      h.appendChild(live ? selIn(COLORS, r.colorPick, (v) => { r.colorPick = v; }) : piece(T('بنفش', 'purple'), 'num'));
    } else if (s.kind === 'compass') {
      h.appendChild(piece(T(s.fa, s.en)));
      h.appendChild(live ? selIn(DIRS, r.dir, (v) => { r.dir = +v; }) : piece(T('↑ بالا', 'up ↑'), 'num'));
      h.appendChild(piece(T('هستم', '')));
    } else if (s.kind === 'room') {
      h.appendChild(piece(T(s.fa, s.en)));
      h.appendChild(live ? selIn(ROOMS, r.roomPick, (v) => { r.roomPick = +v; }) : piece(T('آشپزخانه', 'kitchen'), 'num'));
      h.appendChild(piece(T('هستم', '')));
    } else if (s.kind === 'clean') {
      h.appendChild(piece(T(s.fa, s.en)));
      h.appendChild(live ? selIn(ROOMS.slice(1), r.cleanRoom, (v) => { r.cleanRoom = +v; }) : piece(T('آشپزخانه', 'kitchen'), 'num'));
      h.appendChild(piece(T('بیش از', 'is over')));
      h.appendChild(live ? numIn(r.cleanPct, 5, 99, 1, (v) => { r.cleanPct = v; }) : piece('80', 'num'));
      h.appendChild(piece(T('٪ مال من است', '% mine')));
    }
    if (live) {
      h.appendChild(xBtn(() => { r.members.splice(r.members.indexOf(id), 1); }));
      if (lastAdded === 'cond:' + ri + ':' + id) h.classList.add('pop');
    } else {
      h.draggable = true;
      h.ondragstart = (e) => dragStart(e, { src: 'pal', kind: 'sens', id: id }, h);
      h.onclick = () => tapSens(id);
      h.tabIndex = 0;
      h.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapSens(id); } };
    }
    return h;
  }

  /* ---- the palette ---- */
  function buildPalette() {
    // control: the "if … then" block
    const pc = $('palCtrl');
    const mini = document.createElement('div');
    mini.className = 'cmini';
    mini.innerHTML = '<div class="chead"><span class="kw">' + T('اگر', 'if') + '</span><span class="hex empty" style="min-width:90px">' + T('شرط', 'condition') + '</span><span class="kw">' + T('آنگاه', 'then') + '</span></div>' +
      '<div class="cbody"></div><div class="cfoot"></div>';
    mini.draggable = true;
    mini.ondragstart = (e) => dragStart(e, { src: 'pal', kind: 'if' }, mini);
    mini.onclick = () => { addRule([]); refresh(); };
    mini.tabIndex = 0;
    mini.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addRule([]); refresh(); } };
    pc.appendChild(mini);
    const ps = $('palSens');
    SENSORS.forEach((s) => ps.appendChild(hexChip(s.id, null)));
    const pa = $('palActs');
    ACT_IDS.forEach((id) => pa.appendChild(moveBlock(mkMove(id, ACTS[id].secs, ACTS[id].def), { live: false })));
  }
  function tapMove(act) {
    const m = mkMove(act, ACTS[act].secs, ACTS[act].def);
    if (sel.where === 'rule' && R()[sel.ri]) {
      R()[sel.ri].moves.push(m);
      lastAdded = 'move:rule:' + sel.ri + ':' + (R()[sel.ri].moves.length - 1);
    } else {
      sel = { where: 'plan', ri: 0 };
      FILE.plan.push(m);
      lastAdded = 'move:plan:' + (FILE.plan.length - 1);
    }
    refresh();
  }
  function tapSens(id) {
    let ri = sel.where === 'rule' ? sel.ri : -1;
    if (!R()[ri]) { addRule([]); ri = 0; }
    const r = R()[ri];
    if (r.members.indexOf(id) < 0) { r.members.push(id); lastAdded = 'cond:' + ri + ':' + id; }
    sel = { where: 'rule', ri: ri };
    refresh();
  }
  function addRule(members) {
    FILE.rules.unshift(newRule(members));    // born on top: asked first
    sel = { where: 'rule', ri: 0 };
  }

  /* ---- drag & drop ---- */
  function dragStart(e, payload, el) {
    DRAG = payload;
    el.classList.add('dragging');
    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'blk'); } catch (err) { /* old browsers */ }
    if (payload.src === 'ws') $('palcard').classList.add('trash');
  }
  document.addEventListener('dragend', () => {
    DRAG = null; clearHover();
    document.querySelectorAll('.dragging').forEach((x) => x.classList.remove('dragging'));
    $('palcard').classList.remove('trash');
    $('ws').classList.remove('over');
  });
  let hoverEl = null;
  function clearHover() {
    if (hoverEl) { hoverEl.classList.remove('ins-end'); hoverEl.querySelectorAll('.ins').forEach((x) => x.classList.remove('ins')); }
    hoverEl = null;
    document.querySelectorAll('.chead.over').forEach((x) => x.classList.remove('over'));
  }
  function indexAt(body, y) {
    const kids = Array.prototype.slice.call(body.querySelectorAll(':scope > .blk'));
    let idx = kids.length;
    kids.some((k, i) => { const b = k.getBoundingClientRect(); if (y < b.top + b.height / 2) { idx = i; return true; } return false; });
    return idx;
  }
  function wireBody(body, where, ri) {
    body.ondragover = (e) => {
      if (!DRAG || DRAG.kind !== 'move') return;
      e.preventDefault(); e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      const idx = indexAt(body, e.clientY);
      clearHover(); hoverEl = body;
      const kids = body.querySelectorAll(':scope > .blk');
      if (idx < kids.length) kids[idx].classList.add('ins'); else body.classList.add('ins-end');
    };
    body.ondragleave = (e) => { if (!body.contains(e.relatedTarget)) clearHover(); };
    body.ondrop = (e) => {
      if (!DRAG || DRAG.kind !== 'move') return;
      e.preventDefault(); e.stopPropagation();
      dropMove(where, ri, indexAt(body, e.clientY));
    };
  }
  function dropMove(where, ri, idx) {
    const target = where === 'plan' ? FILE.plan : R()[ri].moves;
    if (DRAG.src === 'pal') {
      target.splice(idx, 0, mkMove(DRAG.id, ACTS[DRAG.id].secs, ACTS[DRAG.id].def));
    } else {
      const from = DRAG.where === 'plan' ? FILE.plan : R()[DRAG.ri].moves;
      const m = from.splice(DRAG.mi, 1)[0];
      if (!m) { DRAG = null; refresh(); return; }
      if (from === target && DRAG.mi < idx) idx--;
      target.splice(idx, 0, m);
    }
    lastAdded = 'move:' + where + ':' + (where === 'rule' ? ri + ':' : '') + idx;
    sel = { where: where, ri: ri };
    DRAG = null;
    refresh();
  }
  function wireHead(head, r, ri) {
    head.ondragover = (e) => {
      if (!DRAG || DRAG.kind !== 'sens') return;
      e.preventDefault(); e.stopPropagation();
      clearHover(); head.classList.add('over');
    };
    head.ondragleave = (e) => { if (!head.contains(e.relatedTarget)) head.classList.remove('over'); };
    head.ondrop = (e) => {
      if (!DRAG || DRAG.kind !== 'sens') return;
      e.preventDefault(); e.stopPropagation();
      if (r.members.indexOf(DRAG.id) < 0) { r.members.push(DRAG.id); lastAdded = 'cond:' + ri + ':' + DRAG.id; }
      sel = { where: 'rule', ri: ri };
      DRAG = null; refresh();
    };
  }
  // the workspace floor: a hexagon or an if-block makes a NEW rule, a move joins the plan
  (function wireFloor() {
    const ws = $('ws');
    ws.ondragover = (e) => {
      if (!DRAG || DRAG.src !== 'pal') return;
      e.preventDefault(); ws.classList.add('over');
    };
    ws.ondragleave = (e) => { if (!ws.contains(e.relatedTarget)) ws.classList.remove('over'); };
    ws.ondrop = (e) => {
      if (!DRAG || DRAG.src !== 'pal') return;
      e.preventDefault();
      if (DRAG.kind === 'sens') { addRule([DRAG.id]); lastAdded = 'cond:0:' + DRAG.id; }
      else if (DRAG.kind === 'if') addRule([]);
      else if (DRAG.kind === 'move') { FILE.plan.push(mkMove(DRAG.id, ACTS[DRAG.id].secs, ACTS[DRAG.id].def)); sel = { where: 'plan', ri: 0 }; lastAdded = 'move:plan:' + (FILE.plan.length - 1); }
      DRAG = null; refresh();
    };
    // dropping a workspace block back on the palette deletes it
    const pal = $('palcard');
    pal.ondragover = (e) => { if (DRAG && DRAG.src === 'ws') e.preventDefault(); };
    pal.ondrop = (e) => {
      if (!DRAG || DRAG.src !== 'ws') return;
      e.preventDefault();
      const from = DRAG.where === 'plan' ? FILE.plan : (R()[DRAG.ri] || {}).moves;
      if (from) from.splice(DRAG.mi, 1);
      DRAG = null; refresh();
    };
  }());

  /* ---- the scripts ---- */
  function slotHint(txt) {
    const s = document.createElement('div');
    s.className = 'slot'; s.textContent = txt;
    return s;
  }
  function renderRule(r, i) {
    const sc = document.createElement('div');
    sc.className = 'script rule' + (sel.where === 'rule' && sel.ri === i ? ' sel' : '') + (r.on === false ? ' off' : '');
    sc.onclick = () => { sel = { where: 'rule', ri: i }; markSel(); };
    const c = document.createElement('div');
    c.className = 'cblk';
    const head = document.createElement('div');
    head.className = 'chead';
    const idx = document.createElement('span'); idx.className = 'idx'; idx.textContent = i + 1;
    head.appendChild(idx);
    head.appendChild(piece(T('اگر', 'if'), 'kw'));
    if (!r.members.length) {
      const e = document.createElement('span');
      e.className = 'hex empty'; e.textContent = T('یک شش‌ضلعی را اینجا بینداز', 'drop a hexagon here');
      head.appendChild(e);
    }
    r.members.forEach((id, k) => {
      if (k) head.appendChild(piece(T('و', 'and'), 'kw'));
      head.appendChild(hexChip(id, r, i));
    });
    head.appendChild(piece(T('آنگاه', 'then'), 'kw'));
    const tools = document.createElement('span');
    tools.className = 'rtools';
    const mk = (t, title, fn, dis) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = t; b.title = title; b.disabled = !!dis;
      b.onclick = (e) => { e.stopPropagation(); fn(); refresh(); };
      tools.appendChild(b);
    };
    mk('↑', T('زودتر پرسیده شود', 'ask earlier'), () => { if (i > 0) { const t = R()[i]; R()[i] = R()[i - 1]; R()[i - 1] = t; sel = { where: 'rule', ri: i - 1 }; } }, i === 0);
    mk('↓', T('دیرتر پرسیده شود', 'ask later'), () => { if (i < R().length - 1) { const t = R()[i]; R()[i] = R()[i + 1]; R()[i + 1] = t; sel = { where: 'rule', ri: i + 1 }; } }, i === R().length - 1);
    mk(r.on === false ? '◻' : '☑', T('در فایل باشد یا نه', 'include in the file'), () => { r.on = r.on === false; });
    mk('×', T('حذف این قانون', 'delete this rule'), () => { R().splice(i, 1); sel = { where: 'plan', ri: 0 }; });
    head.appendChild(tools);
    wireHead(head, r, i);
    c.appendChild(head);
    const body = document.createElement('div');
    body.className = 'cbody';
    if (!r.moves.length) body.appendChild(slotHint(T('یک بلوک آبی را اینجا بینداز…', 'drop a blue block here…')));
    r.moves.forEach((m, mi) => body.appendChild(moveBlock(m, { live: true, where: 'rule', ri: i, mi: mi, remove: () => { r.moves.splice(mi, 1); } })));
    wireBody(body, 'rule', i);
    c.appendChild(body);
    const foot = document.createElement('div');
    foot.className = 'cfoot';
    c.appendChild(foot);
    sc.appendChild(c);
    return sc;
  }
  function renderPlan() {
    const sc = document.createElement('div');
    sc.className = 'script plan' + (sel.where === 'plan' ? ' sel' : '');
    sc.onclick = () => { sel = { where: 'plan', ri: 0 }; markSel(); };
    const hat = document.createElement('div');
    hat.className = 'hat';
    hat.appendChild(piece('🏁', 'flag'));
    hat.appendChild(piece(T('وقتی مسابقه شروع شد', 'when the match starts')));
    sc.appendChild(hat);
    const body = document.createElement('div');
    body.className = 'pbody';
    if (!FILE.plan.length) {
      // the plan is empty: the robot just drives — that IS a block, the one the AI helper calls "drive"
      const d = document.createElement('div');
      d.className = 'blk drive stk';
      d.appendChild(piece('⬆️', 'ic'));
      d.appendChild(piece(T('همیشه مستقیم برو، با سرعت', 'always drive straight, at speed')));
      d.appendChild(numIn(FILE.drive, 1, 25, 1, (v) => { FILE.drive = v; }));
      body.appendChild(d);
      body.appendChild(slotHint(T('یا بلوک‌های آبی را اینجا بچین: برنامه‌ی حرکت‌به‌حرکتِ ربات', 'or stack blue blocks here: the robot\'s move-by-move plan')));
    } else {
      FILE.plan.forEach((m, mi) => body.appendChild(moveBlock(m, { live: true, where: 'plan', ri: 0, mi: mi, remove: () => { FILE.plan.splice(mi, 1); } })));
    }
    wireBody(body, 'plan', 0);
    sc.appendChild(body);
    if (FILE.plan.length) {
      const cap = document.createElement('div');
      cap.className = 'cap';
      cap.textContent = FILE.loop ? T('🔁 دوباره از اول', '🔁 start again from the top') : T('⏹ آخرش بایست', '⏹ stand still at the end');
      cap.title = T('بزن تا عوض شود', 'tap to switch');
      cap.onclick = (e) => { e.stopPropagation(); FILE.loop = !FILE.loop; refresh(); };
      sc.appendChild(cap);
    }
    return sc;
  }
  function markSel() {
    document.querySelectorAll('.script').forEach((s) => s.classList.remove('sel'));
    const scripts = document.querySelectorAll('.script');
    if (sel.where === 'plan') { const p = document.querySelector('.script.plan'); if (p) p.classList.add('sel'); }
    else if (scripts[sel.ri]) scripts[sel.ri].classList.add('sel');
  }
  function drawWorkspace() {
    const ws = $('ws');
    ws.innerHTML = '';
    if (sel.where === 'rule' && !R()[sel.ri]) sel = { where: 'plan', ri: 0 };
    R().forEach((r, i) => ws.appendChild(renderRule(r, i)));
    ws.appendChild(renderPlan());
    if (!R().length) {
      const e = document.createElement('div');
      e.className = 'empty';
      e.innerHTML = T('هنوز قانونی نداری. یک <b>شش‌ضلعی</b> یا بلوک <b>«اگر … آنگاه»</b> را از ستون بلوک‌ها به اینجا بکش (یا رویش بزن) تا اولین قانونت ساخته شود.',
        'No rule yet. Drag a <b>hexagon</b> or the <b>"if … then"</b> block here (or tap it) to build your first rule.');
      ws.appendChild(e);
    }
  }

  /* ================================================================
     WIRING
     ================================================================ */
  function refresh() {
    drawWorkspace();
    $('code').textContent = toPython();
    const n = R().filter((r) => r.on !== false && r.members.length && r.moves.length).length;
    $('barHint').textContent = T(
      R().length + ' قانون · ' + n + ' در فایل · ' + FILE.plan.length + ' حرکت در برنامه. همین قانون‌ها در هلپر AI هم باز می‌شوند.',
      R().length + ' rule' + (R().length === 1 ? '' : 's') + ' · ' + n + ' in the file · ' + FILE.plan.length + ' move' + (FILE.plan.length === 1 ? '' : 's') + ' in the plan. The SAME rules open in the AI helper.');
    lastAdded = null;
    saveFile();
  }
  function toast(msg, undoLabel) {
    const t = $('toast');
    t.innerHTML = '';
    t.appendChild(document.createTextNode(msg));
    if (undoLabel && undoFile) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = undoLabel;
      b.onclick = () => { FILE = undoFile; undoFile = null; sel = { where: 'plan', ri: 0 }; refresh(); t.className = 'toast'; };
      t.appendChild(b);
    }
    t.className = 'toast on';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.className = 'toast'; }, undoLabel ? 7000 : 2400);
  }
  function takeFile(f, msg) {
    undoFile = FILE;
    FILE = f; sel = { where: 'plan', ri: 0 };
    refresh();
    toast(msg, T('برگردان', 'Undo'));
  }
  function openText(text) {
    const got = fileFromText(text);
    if (!got) { toast(T('در این پایتون نه قانونی به سبک هلپر پیدا شد، نه برنامه‌ای', 'No helper-style rules or plan found in that Python')); return; }
    if (got.foreign) {
      toast(T('این فایل برای رده‌ی ' + got.foreign.toUpperCase() + ' ساخته شده — در هلپر همان رده بازش کنید',
        'That file was built for the ' + got.foreign.toUpperCase() + ' division — open it in that helper'));
      return;
    }
    const f = got.file;
    takeFile(f, T('باز شد: ' + f.rules.length + ' قانون و ' + f.plan.length + ' حرکت — ادامه بدهید',
      'Open: ' + f.rules.length + ' rule' + (f.rules.length === 1 ? '' : 's') + ' and ' + f.plan.length + ' move' + (f.plan.length === 1 ? '' : 's') + ' — keep building'));
  }

  // ---- the team name ----
  (function wireTeamName() {
    const box = $('teamNameIn');
    box.value = TEAM_NAME;
    box.addEventListener('input', () => {
      TEAM_NAME = box.value.trim().slice(0, 40);
      try { localStorage.setItem(TEAM_KEY, TEAM_NAME); } catch (e) { /* private mode */ }
      $('code').textContent = toPython();
    });
  }());

  load();
  buildPalette();

  // ---- a .py the GAME just loaded parked itself here — take it, keep one undo ----
  let pendingMsg = null;
  try {
    const IK = 'shl_helper_import_' + LEAGUE;
    const imp = localStorage.getItem(IK);
    if (imp) {
      localStorage.removeItem(IK);
      const j = JSON.parse(imp);
      let f = null;
      if (j && (!j.league || j.league === LEAGUE || j.app === 'fsapp')) f = fileFromState(j);
      if (f) { undoFile = FILE; FILE = f; pendingMsg = T('فایلی که در بازی باز کردید همین‌جاست — ادامه بدهید', 'The file you loaded in the game is open here — keep building'); }
    }
    // a plain .py (no HELPER-STATE) the game loaded: READ it into blocks
    const PK = 'shl_helper_pytext_' + LEAGUE;
    const txt = localStorage.getItem(PK);
    if (txt) {
      localStorage.removeItem(PK);
      if (!pendingMsg) {
        const got = fileFromText(txt);
        if (got && got.file) { undoFile = FILE; FILE = got.file; pendingMsg = T('پایتونی که در بازی باز کردید خوانده شد و بلوک شد — ادامه بدهید', 'The Python you loaded in the game was read into blocks — keep building'); }
      }
    }
  } catch (e) { /* private mode */ }

  $('addRule').onclick = () => { addRule([]); refresh(); };
  $('resetBtn').onclick = () => {
    undoFile = FILE;
    FILE = normFile(null); sel = { where: 'plan', ri: 0 }; refresh();
    toast(T('همه‌ی بلوک‌ها پاک شد', 'All blocks cleared'), T('برگردان', 'Undo'));
  };
  $('openPyBtn').onclick = () => $('openPyFile').click();
  $('openPyFile').onchange = () => {
    const f = $('openPyFile').files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { $('openPyFile').value = ''; openText(String(rd.result || '')); };
    rd.readAsText(f);
  };
  // paste Python anywhere on the page (outside an input) → blocks
  document.addEventListener('paste', (e) => {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const txt = (e.clipboardData || window.clipboardData).getData('text');
    if (txt && /wheelleft|movetime|forward\(|state ==/.test(txt)) { e.preventDefault(); openText(txt); }
  });
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
  $('dlPyBtn').onclick = () => download(toPython(), pyFileName('my-robot.py'), 'text/x-python');
  $('playBtn').onclick = () => {
    try { localStorage.setItem(HANDOFF_KEY, toPython()); }
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
  SET('uiTitle', 'هلپر بلاکی', 'Blocks helper');
  SET('openPyBtn', '📥 باز کردن فایل پایتون', '📥 Open a Python file');
  SET('resetBtn', 'از نو', 'Start over');
  SET('backLink', '&#8594; برگرد به بازی', '&#8592; Back to the game');
  SET('h2Pal', '<span class="step">۱</span> بلوک‌ها', '<span class="step">1</span> Blocks');
  SET('palHint', 'بلوک را بکش و در برنامه بینداز — یا رویش بزن تا در اسکریپتِ انتخاب‌شده بنشیند. شش‌ضلعی‌ها «شرط»اند، آبی‌ها «حرکت».',
    'Drag a block into the program — or tap it and it snaps into the selected script. Hexagons are CONDITIONS, blue blocks are MOVES.');
  SET('palHeadCtrl', 'کنترل', 'Control');
  SET('palHeadSens', 'حسگرها (شرط‌ها)', 'Sensing (conditions)');
  SET('palHeadActs', 'حرکت‌ها', 'Motion');
  SET('trashHint', 'برای حذف، بلوک را از برنامه بکش و همین‌جا رها کن — یا × رویش را بزن.',
    'To delete, drag a block out of the program and drop it here — or tap its ×.');
  SET('h2Work', '<span class="step">۲</span> برنامه‌ی ربات', '<span class="step">2</span> Your robot\'s program');
  SET('workHint', 'قانونِ بالاتر زودتر پرسیده می‌شود؛ کلاهِ زرد برنامه‌ی همیشگی است — وقتی هیچ قانونی مشغول نیست.',
    'A higher rule is asked first; the yellow hat is the everyday plan — it runs whenever no rule is busy.');
  SET('addRule', '+ قانون جدید', '+ New rule');
  SET('h2Code', '<span class="step">۳</span> پایتونِ همین بلوک‌ها <span class="hint">— فایل واقعی‌ای که مسابقه اجرا می‌کند</span>',
    '<span class="step">3</span> The Python of these blocks <span class="hint">— the real file the match runs</span>');
  SET('copyBtn', 'کپی پایتون', 'Copy Python');
  SET('dlPyBtn', '&#11015; دانلود کد پایتون', '&#11015; Download the Python');
  SET('playBtn', '&#9654; بازی با این کد', '&#9654; Play with this code');
  $('teamNameIn').placeholder = T('نام تیم', 'team name');
  $('teamNameIn').title = T('نام تیم شما — داخل فایل پایتون نوشته می‌شود تا داور بداند این کد مال کیست', 'Your team name — written into the Python file so the referee knows whose code it is');
  $('themeBtn').title = T('روشن / تاریک', 'light / dark');
  $('subTitle').textContent = U14 ? T('زیر ۱۴ سال · لیگ جاروبرقی', 'U14 · Vacuum league')
    : /(^|-)fs$/.test(LEAGUE) ? T('فرست استپ · لیگ جاروبرقی', 'First Step · Vacuum league') : LEAGUE;
  document.title = T('هلپر بلاکی', 'Blocks helper') + ' · ' + (U14 ? 'U14' : 'First Step');

  /* ---- go ---- */
  refresh();
  if (pendingMsg) setTimeout(() => toast(pendingMsg, T('برگردان', 'Undo')), 400);
})();
