/* ============================================================
   fsapp/fsapp.js  —  «Build with Blocks»  ·  the FS block coding app.

   An 8-year-old does not open an empty editor. He picks colourful
   blocks, or he simply TYPES a sentence — and this app turns both
   into a REAL Python file, the same file the match runs.

       FSApp.open({ onDone(pythonSource) { ... } });

   Self-contained: it builds its own DOM, brings its own stylesheet
   (fsapp.css) and touches nothing else in the game. The only thing
   it hands back is Python text.

   THE OUTPUT IS THE PRODUCT. Everything below exists to produce a
   file that pyreader.js compiles and the engine drives.

   The base language of this app is ENGLISH: every label, every
   message and every line of the generated Python. The sentence
   parser still understands Persian as a bonus, because a child who
   types in his own language should never be told "I do not know
   that word".
   ============================================================ */
(function (root) {
  'use strict';

  // digits stay plain 0-9 everywhere, in the panel and in the code.
  // faD() used to swap them for Persian digits; it is retired to an
  // identity so every call site keeps working and reads 3, not ۳.
  const faD = (v) => String(v);

  /* ================================================================
     1. THE BLOCKS  —  the whole vocabulary of the app lives here.
        Add an entry and the palette, the parser, the strip and the
        Python writer all learn it at once.
     ================================================================ */

  // fat, friendly icons — inline SVG only: no image file, no icon font,
  // and no emoji we cannot be sure the venue's machine can draw
  const ICON = {
    forward: '<svg viewBox="0 0 24 24"><path d="M12 3.2 20.4 12h-4.7v8.8H8.3V12H3.6z"/></svg>',
    backward: '<svg viewBox="0 0 24 24"><path d="M12 20.8 3.6 12h4.7V3.2h7.4V12h4.7z"/></svg>',
    turnright: '<svg viewBox="0 0 24 24"><path d="M5 21v-6.5A5.5 5.5 0 0 1 10.5 9H16V4.5L22.5 11 16 17.5V13h-5.5c-.8 0-1.5.7-1.5 1.5V21z"/></svg>',
    turnleft: '<svg viewBox="0 0 24 24"><path d="M19 21v-6.5A5.5 5.5 0 0 0 13.5 9H8V4.5L1.5 11 8 17.5V13h5.5c.8 0 1.5.7 1.5 1.5V21z"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><path d="M8.2 2.6h7.6l5.6 5.6v7.6l-5.6 5.6H8.2l-5.6-5.6V8.2z"/></svg>',
    wall: '<svg viewBox="0 0 24 24"><path d="M3 3.6h7.4v4.6H3zM11.6 3.6H21v4.6h-9.4zM3 9.7h4.4v4.6H3zM8.6 9.7h6.8v4.6H8.6zM16.6 9.7H21v4.6h-4.4zM3 15.8h7.4v4.6H3zM11.6 15.8H21v4.6h-9.4z"/></svg>',
    bump: '<svg viewBox="0 0 24 24"><path d="m12 1.4 2.6 5.3 5.4-2.3-2.2 5.5 5.3 2.4-5.3 2.3 2.2 5.5-5.4-2.3L12 22.6l-2.6-5.2-5.4 2.3 2.2-5.5L1 12l5.2-2.3-2.2-5.5 5.4 2.3z"/></svg>',
    color: '<svg viewBox="0 0 24 24"><circle cx="8.6" cy="8.4" r="5.5"/><circle cx="15.4" cy="8.4" r="5.5" opacity=".72"/><circle cx="12" cy="15.2" r="5.5" opacity=".55"/></svg>',
  };

  // the five moves. wl/wr are the wheel speeds the generated code writes,
  // easy is the one-call helper the reaction blocks use.
  const MOVES = {
    forward: { fa: 'Go forward', c: '#22c55e', c2: '#16a34a', wl: 25, wr: 25, easy: 'forward', why: '25 and 25 = full speed ahead' },
    backward: { fa: 'Go backward', c: '#fb923c', c2: '#ea580c', wl: -25, wr: -25, easy: 'backward', why: 'a minus means backwards' },
    turnright: { fa: 'Turn right', c: '#38bdf8', c2: '#0284c7', wl: 18, wr: -18, easy: 'turnright', why: 'left forward, right back = spin' },
    turnleft: { fa: 'Turn left', c: '#c084fc', c2: '#9333ea', wl: -18, wr: 18, easy: 'turnleft', why: 'right forward, left back = spin' },
    stop: { fa: 'Stop', c: '#f43f5e', c2: '#be123c', wl: 0, wr: 0, easy: 'stop', why: 'zero and zero = stay right here' },
  };
  const MOVE_IDS = ['forward', 'backward', 'turnright', 'turnleft', 'stop'];

  // the three things the robot can notice
  const WALL_CM = 45;
  const CONDS = {
    wall: {
      fa: 'If a wall is close', c: '#f59e0b', c2: '#b45309',
      py: () => 'front < ' + WALL_CM, why: 'a wall closer than ' + faD(WALL_CM) + ' cm',
    },
    bump: {
      fa: 'If you bump into something', c: '#ec4899', c2: '#be185d',
      py: () => 'bumper == 1', why: 'the ring around the robot touched something',
    },
    color: {
      fa: 'If the floor ahead is …', c: '#06b6d4', c2: '#0e7490',
      py: (b) => 'color == ' + b.color, why: 'the colour sensor reads the floor ahead',
    },
  };
  const COND_IDS = ['wall', 'bump', 'color'];

  // the floor colours the colour sensor reports (the ids ARE the Python names)
  const COLORS = [
    { id: 'white', fa: 'white', hex: '#f8fafc', note: 'floor nobody has cleaned yet' },
    { id: 'green', fa: 'green', hex: '#22c55e', note: 'the big rug' },
    { id: 'purple', fa: 'purple', hex: '#a855f7', note: 'the small rug' },
    { id: 'black', fa: 'black', hex: '#111827', note: 'a wall or the furniture' },
    { id: 'red', fa: 'red', hex: '#ef4444', note: 'the red robot cleaned it' },
    { id: 'blue', fa: 'blue', hex: '#3b82f6', note: 'the blue robot cleaned it' },
  ];
  const COLOR_FA = {}; COLORS.forEach((c) => { COLOR_FA[c.id] = c; });

  const SECS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];   // the allowed durations

  /* ---------------- small helpers ---------------- */

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function clampSecs(v) {
    let n = +v; if (!(n > 0)) n = 1;
    if (n < 0.5) n = 0.5; if (n > 10) n = 10;
    return Math.round(n * 10) / 10;
  }
  function stepSecs(v, dir) {           // walk along the SECS ladder
    let i = 0, best = 1e9;
    SECS.forEach((s, k) => { const d = Math.abs(s - v); if (d < best) { best = d; i = k; } });
    i = Math.max(0, Math.min(SECS.length - 1, i + dir));
    return SECS[i];
  }
  const pyNum = (n) => String(Math.round(n * 10) / 10);
  const ticks = (n) => Math.max(1, Math.round(n * 10));   // 10 runs = 1 second
  // "1 second" but "2 seconds" — a child notices the wrong one
  const secLabel = (n) => pyNum(n) + (pyNum(n) === '1' ? ' second' : ' seconds');

  function blockLabel(b) {
    if (b.t === 'move') return MOVES[b.act].fa + ' — ' + secLabel(b.secs);
    const C = CONDS[b.cond];
    const head = b.cond === 'color' ? ('If the floor ahead is ' + COLOR_FA[b.color].fa) : C.fa;
    return head + ' → ' + MOVES[b.act].fa + ' ' + secLabel(b.secs);
  }

  const mkMove = (act, secs) => ({ t: 'move', act, secs: clampSecs(secs) });
  const mkWhen = (cond, act, secs, color) => ({
    t: 'when', cond, act, secs: clampSecs(secs), color: color || 'green',
  });

  /* ================================================================
     2. THE PYTHON WRITER  —  blocks in, a real .py file out.

        Rules of the file it writes (all checked against pyreader.js):
          · it is re-run 10 times every second, top to bottom
          · nothing may "wait": a long move is remembered in `timer`
            and `state`, exactly like the FS starter program
          · the reaction blocks use the easy moves (backward(1) …),
            which the reader itself keeps running to the last tick,
            so they override the plan's wheels while they last
          · the lines stay short, so a child can read them in the pane
     ================================================================ */

  function toPython(blocks, loop) {
    const B = (blocks || []).slice();
    const moves = B.filter((b) => b.t === 'move');
    const whens = B.filter((b) => b.t === 'when');
    const n = moves.length;
    const L = [];
    const P = (s) => L.push(s == null ? '' : s);
    const cm = (code, note) => {                 // code + a comment, lined up
      if (!note) return code;
      const pad = code.length >= 26 ? 1 : 27 - code.length;
      return code + new Array(pad + 1).join(' ') + '# ' + note;
    };
    const BAR = '# ==========================================';

    /* ---- the title page: what the child built, in his own words ---- */
    P('# type: ignore');
    P('# cspell:ignore wheelleft wheelright');
    P(BAR);
    P('#  🧩 MY PROGRAM — built out of blocks');
    P('#');
    P('#  This is a real Python file.');
    P('#  The game runs it 10 times every second,');
    P('#  from the top down. So 10 times = 1 second:');
    P('#      timer = 10  ->  1 second');
    P('#      timer = 5   ->  half a second');
    P('#');
    if (B.length) {
      P('#  My blocks:');
      B.forEach((b, i) => P('#   ' + faD(i + 1) + ') ' + blockLabel(b)));
    } else {
      P('#  I have not picked any block yet.');
    }
    P(BAR);
    P('');

    /* ---- the block the game skips (only for a code editor's eyes) ---- */
    P('# === EDITOR SETUP =========================');
    P('# The game SKIPS this block. It is only here');
    P('# so the editor stops drawing red lines under');
    P('# the names of the sensors.');
    P('front = 200; frontleft = 200');
    P('frontright = 200');
    P('left = 200; right = 200');
    P('color = 0; bumper = 0');
    P('timer = 0; state = 0');
    P('white = 0; red = 1; blue = 2');
    P('green = 3; black = 4; purple = 5');
    P('wheelleft = 0; wheelright = 0');
    P('# === END EDITOR SETUP =====================');
    P('');

    /* ---- 1) the reactions: they ride on top of the plan ---- */
    if (whens.length) {
      P('');
      P('# ---------- ' + faD(1) + ') THINGS THAT HAPPEN ----------');
      P('# These come first: whichever one is true');
      P('# starts its move, and the robot does');
      P('# nothing else until that move is over.');
      whens.forEach((b, i) => {
        const C = CONDS[b.cond], M = MOVES[b.act];
        let note = C.why;
        if (b.cond === 'color') note = COLOR_FA[b.color].fa + ' = ' + COLOR_FA[b.color].note;
        P(cm((i === 0 ? 'if ' : 'elif ') + C.py(b) + ':', note));
        P(cm('    ' + M.easy + '(' + pyNum(b.secs) + ')', M.fa + ' ' + secLabel(b.secs)));
      });
      P('');
    }

    /* ---- 2) the plan: the moves, one after another ---- */
    P('');
    P('# ---------- ' + faD(whens.length ? 2 : 1) + ') MY PLAN ----------');
    if (!n) {
      P('# I have put no job in the plan,');
      P('# so I just drive gently ahead.');
      P(cm('wheelleft = 25', 'the left wheel'));
      P(cm('wheelright = 25', 'the right wheel'));
    } else {
      P('# state = which job I am doing right now');
      P('# timer = how many more times this same job');
      P('#         keeps going (10 times = 1 second)');
      P('');
      P(cm('if timer > 0:', 'still in the middle of a job'));
      P(cm('    timer = timer - 1', 'count one off'));
      P('');
      P(cm('if timer == 0:', 'time is up -> the next job'));
      P('    state = state + 1');
      P(cm('    if state > ' + n + ':', loop ? 'after the last one, start again' : 'after the last one, we are done'));
      P('        state = ' + (loop ? '1' : (n + 1)));
      P('');
      moves.forEach((b, i) => {
        const M = MOVES[b.act];
        P(cm((i === 0 ? 'if' : 'elif') + ' state == ' + (i + 1) + ':', faD(i + 1) + ') ' + M.fa));
        P(cm('    wheelleft = ' + M.wl, M.why));
        P('    wheelright = ' + M.wr);
        P(cm('    if timer == 0:', 'has it just started?'));
        P(cm('        timer = ' + ticks(b.secs), secLabel(b.secs) + ' = ' + faD(ticks(b.secs)) + ' times'));
        P('');
      });
      if (!loop) {
        P(cm('else:', 'every job is done — stand still'));
        P('    wheelleft = 0');
        P('    wheelright = 0');
      }
    }
    P('# --- Keep the next line. It lets the helper reopen this file so you\n#     can carry on building. It stores what the HELPER built, so if\n#     you edit the Python below by hand, those edits are yours alone\n#     and will not come back with it. ---');
    P('# --- خط بعدی را پاک نکنید. با آن، هلپر همین فایل را دوباره باز می\u200cکند\n#     تا ادامه بدهید. آنچه ذخیره می\u200cشود ساخته\u200cی هلپر است؛ پس اگر\n#     پایتونِ پایین را با دست تغییر بدهید، آن تغییرها با فایل\n#     برنمی\u200cگردند. ---');
    P(stateEncodeFS({ blocks: B, loop: !!loop }));
    P('');
    return L.join('\n');
  }

  // the model rides inside the file as one comment line, so the panel can
  // reopen any file it wrote and keep building
  function stateEncodeFS(model) {
    const json = JSON.stringify({ app: 'fsapp', v: 1, model: model });
    return '# HELPER-STATE shl1:' + btoa(unescape(encodeURIComponent(json)));
  }
  function stateDecodeFS(text) {
    const m = /#\s*HELPER-STATE\s+shl1:([A-Za-z0-9+/=]+)/.exec(text || '');
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(escape(atob(m[1])))); } catch (e) { return null; }
  }

  /* ================================================================
     3. THE HELPER  —  interpret(text) -> { blocks, lines }

        OFFLINE AND RULE-BASED. There is no model here and no network
        call: it is a keyword table plus a spell-check distance, so it
        behaves identically on a laptop with no internet at all — which
        is exactly what the venue has.

        English is the language the app teaches and the samples show,
        but the Persian words stay in the table: a child who writes in
        his own language is still understood.

        It is deliberately ONE function with ONE signature. The day a
        real language model can be shipped with the game, replace the
        body of interpret() — the palette, the strip, the code pane and
        the buttons will not notice.

        Returns:
          blocks : [block]        what to add to the strip
          lines  : [{ ok, text, note, extra, words, suggest }]
                                  what to tell the child, word by word
     ================================================================ */

  // every keyword the app knows, grouped by what it means
  const KW = {
    move_forward: ['جلو', 'مستقیم', 'forward', 'forwards', 'ahead', 'straight', 'front'],
    move_backward: ['عقب', 'عقبگرد', 'برگرد', 'backward', 'back', 'backwards', 'reverse', 'reverses', 'retreat'],
    move_turnright: ['راست', 'right', 'rightwards', 'clockwise'],
    move_turnleft: ['چپ', 'left', 'leftwards', 'anticlockwise', 'counterclockwise'],
    move_stop: ['بایست', 'وایسا', 'وایستا', 'بمان', 'صبر', 'توقف', 'ایست',
      'stop', 'stops', 'stopped', 'wait', 'waits', 'halt', 'halts', 'pause', 'freeze', 'stay', 'brake'],
    cond_wall: ['دیوار', 'مانع', 'سد', 'wall', 'walls', 'obstacle', 'obstacles'],
    cond_bump: ['خورد', 'خوردی', 'بخوری', 'خوردم', 'برخورد', 'ضربه', 'تصادف', 'گیر',
      'bump', 'bumps', 'bumped', 'hit', 'hits', 'touch', 'touches', 'touched', 'crash', 'crashes', 'knock'],
    cond_color: ['رنگ', 'فرش', 'قالی', 'کف', 'زمین',
      'color', 'colors', 'colour', 'colours', 'carpet', 'carpets', 'rug', 'rugs'],
    near: ['نزدیک', 'جلوت', 'جلویت', 'روبرو', 'روبه', 'near', 'nearby', 'close', 'closer', 'approach'],
    if_: ['اگر', 'اگه', 'وقتی', 'هروقت', 'چنانچه', 'if', 'when', 'whenever'],
    up: ['بالا', 'up'],
    down: ['پایین', 'پائین', 'down'],
    go: ['برو', 'بپیچ', 'بچرخ', 'بگرد', 'حرکت', 'راه', 'بیا',
      'go', 'goes', 'move', 'moves', 'turn', 'turns', 'drive', 'drives', 'come', 'rotate', 'spin', 'walk'],
  };
  // the floor colours by name
  const KW_COLOR = {
    white: ['سفید', 'white'], green: ['سبز', 'green'], purple: ['بنفش', 'purple', 'violet'],
    black: ['سیاه', 'مشکی', 'black'], red: ['قرمز', 'سرخ', 'red'], blue: ['آبی', 'blue'],
  };
  // number words
  const NUMWORD = {
    'نیم': 0.5, 'یک': 1, 'یه': 1, 'دو': 2, 'سه': 3, 'چهار': 4, 'پنج': 5, 'شش': 6, 'شیش': 6,
    'هفت': 7, 'هشت': 8, 'نه': 9, 'ده': 10,
    half: 0.5, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  // words that carry no meaning for us — never reported as "not understood"
  const STOP = ('به از با در را که تا و یا این آن هم بر رو روی سمت طرف طرفِ ثانیه ثانیه‌ای ثانیهای ' +
    'مقدار کن کنی بکن انجام بده باید حالا الان بعد بعدش سپس اول آخر لطفا لطفاً ربات میخوام میخواهم ' +
    'دوباره باز پس چیزی چیز جا جایی همان همون خودت خود شد شدی شده بود بودی باشه باش است هست میشه ' +
    'زیر پایت پات پا زمینی دیدی ببینی دیدم دید بینی نگاه وقت هرگاه موقع کمی یکم آرام یواش ' +
    'the a an to at for of in on into onto and then next after that this it its is was be been are am ' +
    'do does done please my me you your our robot again now first last just only very little bit ' +
    'second seconds sec secs s something anything thing things some any there around while with from by ' +
    'under foot feet floor ground see saw sees look looks find keep keeps start starts got get gets ' +
    'go going want wants would should could ok okay').split(/\s+/);
  const STOPSET = {}; STOP.forEach((w) => { if (w) STOPSET[w] = 1; });

  // which palette block a keyword group stands for (used for the suggestions)
  const GROUP_BLOCK = {
    move_forward: () => mkMove('forward', 2), move_backward: () => mkMove('backward', 1),
    move_turnright: () => mkMove('turnright', 1), move_turnleft: () => mkMove('turnleft', 1),
    move_stop: () => mkMove('stop', 1),
    cond_wall: () => mkWhen('wall', 'turnright', 0.8), cond_bump: () => mkWhen('bump', 'backward', 1),
    cond_color: () => mkWhen('color', 'backward', 1, 'green'),
    up: () => mkMove('forward', 2), down: () => mkMove('backward', 1),
    go: () => mkMove('forward', 2),
  };

  function normalize(s) {
    return String(s || '')
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))     // ۳ -> 3
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))     // ٣ -> 3
      .replace(/[‌‎‏]/g, ' ')                          // half-space, bidi marks
      .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه')
      .toLowerCase()
      // a dot BETWEEN two digits is a decimal point, not a full stop: the app
      // itself writes «0.5 seconds», so the child must be able to type it back
      .replace(/(\d)[.٫](\d)/g, '$1٫$2')        // ٫ survives the sweep below
      .replace(/[.،,;؛:!?؟"'()\[\]{}«»\-_/\\]+/g, ' ٪ ')              // punctuation = a break
      .replace(/٫/g, '.')                                         // … and back to a decimal point
      .replace(/\s+/g, ' ')
      .trim();
  }

  // spell-check distance, for "did you mean …?"
  function dist(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 3) return 9;
    const d = [];
    for (let i = 0; i <= m; i++) d[i] = [i];
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[m][n];
  }
  // short words are NEVER guessed at — «چه» must not become «چپ»
  function nearestGroup(word) {
    if (!word || word.length < 3) return null;
    let best = null, bd = 9;
    for (const g in KW) {
      if (!GROUP_BLOCK[g]) continue;
      for (const k of KW[g]) {
        if (k.length < 3) continue;
        const d = dist(word, k);
        if (d < bd) { bd = d; best = { group: g, word: k, d }; }
      }
    }
    if (!best) return null;
    const lim = Math.max(1, Math.min(2, Math.floor(best.word.length / 3)));
    return best.d <= lim ? best : null;
  }
  const hasWord = (toks, list) => toks.some((t) => list.indexOf(t) >= 0);
  const findWord = (toks, list) => toks.filter((t) => list.indexOf(t) >= 0)[0] || null;
  function leftovers(toks, used) {
    const rest = toks.filter((t) => !used[t] && !STOPSET[t]);
    return rest.length ? rest : null;
  }
  const quo = (w) => '“' + w + '”';        // how the app quotes a word back

  function interpret(text) {
    const out = { blocks: [], lines: [] };
    const norm = normalize(text);
    if (!norm) {
      out.lines.push({ ok: false, text: 'You have not written anything. Try: ' + quo('go forward 3 seconds then turn right') });
      return out;
    }
    // cut the sentence at the joining words … but never inside "one and a half"
    const rough = norm
      // the lookahead uses (?=\s|$), not \b: after a Persian letter \b never fires
      .split(/\s(?:٪|بعدش|بعد از آن|بعد|سپس|and then|then|next|after that|after|and|و)\s(?!(?:a )?(?:half|نیم)(?=\s|$))/)
      .map((s) => s.replace(/^\s*٪\s*/, '').trim())
      .filter((s) => s.length);
    // … and again wherever an "if / when / اگر" starts, because that is a new order
    const parts = [];
    for (const p of rough) {
      const w = p.split(' ');
      let from = 0;
      for (let i = 1; i < w.length; i++) {
        if (KW.if_.indexOf(w[i]) >= 0 && i > from) { parts.push(w.slice(from, i).join(' ')); from = i; }
      }
      parts.push(w.slice(from).join(' '));
    }

    for (const raw of parts) {
      const toks = raw.split(' ').filter((t) => t && t !== '٪');
      if (!toks.length) continue;
      const used = {};                       // which tokens carried meaning
      const mark = (w) => { if (w) used[w] = 1; };

      /* ---- how long? ---- */
      let secs = null;
      for (const t of toks) {
        if (/^\d+(\.\d+)?$/.test(t)) { secs = clampSecs(+t); mark(t); break; }
        if (NUMWORD[t] != null) { secs = clampSecs(NUMWORD[t]); mark(t); break; }
      }
      // "one and a half" / «یک و نیم»
      if (secs != null && hasWord(toks, ['نیم', 'half']) && secs !== 0.5) {
        secs = clampSecs(secs + 0.5); mark('نیم'); mark('half');
      }

      /* ---- which move? ---- */
      let act = null, note = null;
      const pick = (a, group) => { act = a; mark(findWord(toks, KW[group])); };
      if (hasWord(toks, KW.move_turnright)) pick('turnright', 'move_turnright');
      else if (hasWord(toks, KW.move_turnleft)) pick('turnleft', 'move_turnleft');
      else if (hasWord(toks, KW.move_backward)) pick('backward', 'move_backward');
      // stop is checked BEFORE forward: in "if a wall is ahead stop", the word
      // "ahead" only says WHERE the wall is — "stop" is the actual order
      else if (hasWord(toks, KW.move_stop)) pick('stop', 'move_stop');
      else if (hasWord(toks, KW.move_forward)) pick('forward', 'move_forward');
      else if (hasWord(toks, KW.down)) { pick('backward', 'down'); note = 'I read ' + quo('down') + ' as ' + quo('Go backward'); }
      else if (hasWord(toks, KW.up)) { pick('forward', 'up'); note = 'I read ' + quo('up') + ' as ' + quo('Go forward'); }
      if (!act) {
        // a wobbly spelling still counts: "forwrd" is "forward"
        for (const t of toks) {
          if (used[t] || STOPSET[t]) continue;
          const g = nearestGroup(t);
          if (g && g.group.indexOf('move_') === 0) {
            act = g.group.slice(5); mark(t);
            note = 'I read ' + quo(t) + ' as ' + quo(MOVES[act].fa);
            break;
          }
        }
      }
      if (!act && hasWord(toks, KW.go)) {
        pick('forward', 'go');
        note = 'You did not say which way, so I put ' + quo('Go forward');
      }
      mark(findWord(toks, KW.go));

      /* ---- is it a condition? ---- */
      const isIf = hasWord(toks, KW.if_);
      mark(findWord(toks, KW.if_));
      let cond = null, colorId = null;
      for (const id in KW_COLOR) if (hasWord(toks, KW_COLOR[id])) { colorId = id; mark(findWord(toks, KW_COLOR[id])); }
      const nearW = hasWord(toks, KW.near), wallW = hasWord(toks, KW.cond_wall), bumpW = hasWord(toks, KW.cond_bump);
      if (colorId || hasWord(toks, KW.cond_color)) { cond = 'color'; mark(findWord(toks, KW.cond_color)); }
      else if (bumpW && !nearW) { cond = 'bump'; mark(findWord(toks, KW.cond_bump)); }
      else if (wallW || nearW) { cond = 'wall'; mark(findWord(toks, KW.cond_wall)); mark(findWord(toks, KW.near)); }
      if (cond === 'bump') mark(findWord(toks, KW.cond_wall));
      if (cond === 'wall') mark(findWord(toks, KW.cond_bump));

      /* ---- build the block ---- */
      if (cond && (isIf || act)) {
        const a = act || (cond === 'bump' ? 'backward' : 'turnright');
        const b = mkWhen(cond, a, secs != null ? secs : (a === 'turnleft' || a === 'turnright' ? 0.8 : 1), colorId || 'green');
        if (!act) note = (note ? note + ' · ' : '') + 'You did not say what to do, so I put ' + quo(MOVES[a].fa);
        if (cond === 'bump' && wallW) note = (note ? note + ' · ' : '') + 'If you meant ' + quo('getting close to a wall') + ', take the wall block instead';
        out.blocks.push(b);
        out.lines.push({ ok: true, text: blockLabel(b), note, extra: leftovers(toks, used) });
        continue;
      }
      if (act) {
        const b = mkMove(act, secs != null ? secs : (act === 'turnleft' || act === 'turnright' ? 1 : 2));
        if (secs == null) note = (note ? note + ' · ' : '') + 'You did not say how long, so I put ' + secLabel(b.secs);
        out.blocks.push(b);
        out.lines.push({ ok: true, text: blockLabel(b), note, extra: leftovers(toks, used) });
        continue;
      }

      /* ---- not understood: say exactly which words, and offer a block ---- */
      const bad = toks.filter((t) => !used[t] && !STOPSET[t] && !/^\d+(\.\d+)?$/.test(t));
      let sug = null;
      for (const w of bad) {
        const g = nearestGroup(w);
        if (g) { sug = { word: w, group: g.group, block: GROUP_BLOCK[g.group]() }; break; }
      }
      out.lines.push({
        ok: false,
        text: bad.length ? ('I did not understand: ' + bad.map(quo).join(', ')) : ('I did not understand ' + quo(raw)),
        // never a dead end: if nothing is close, say what CAN be said
        note: sug ? null : 'Words I know: go forward · go backward · turn right · turn left · stop · if a wall is close · if you bump · if the floor is …',
        words: bad, suggest: sug,
      });
    }
    if (!out.blocks.length && !out.lines.some((l) => !l.ok)) {
      out.lines.push({ ok: false, text: 'I could not find a single move in that sentence.' });
    }
    return out;
  }

  /* ================================================================
     4. THE PANEL
     ================================================================ */

  const S = { open: false, blocks: [], loop: true, onDone: null, el: null, drag: null,
    // which blocks this LEAGUE offers, and the line it puts at the top. A
    // division declares them in its own rules.js; the engine here stays
    // league-agnostic, so copying it to another league is a one-line change.
    cat: null };
  const catMoves = () => (S.cat && S.cat.moves) || MOVE_IDS;
  const catConds = () => (S.cat && S.cat.conds) || COND_IDS;
  const $ = (id) => document.getElementById(id);

  const SAMPLES = [
    'go forward 3 seconds then turn right',
    'if you bump into something go back',
    'if the colour under you is green turn left',
    'drive forward 2 and then stop',
  ];

  function build() {
    if (S.el) return S.el;
    const d = document.createElement('div');
    d.id = 'fsApp';
    d.className = 'fs-root';
    d.setAttribute('dir', 'ltr');
    d.setAttribute('lang', 'en');
    d.innerHTML = [
      '<div class="fs-sky"><i></i><i></i><i></i></div>',
      '<header class="fs-top">',
      '  <div class="fs-brand"><span class="fs-logo">🧩</span>',
      '    <div><b>Build with Blocks</b><span id="fsSub">Snap blocks together, or just type what you want — a real Python file comes out at the end</span></div>',
      '  </div>',
      '  <button class="fs-close" id="fsClose" type="button">Close ✕</button>',
      '</header>',
      '<div class="fs-grid">',

      '  <section class="fs-card fs-pal">',
      '    <h2><span class="fs-h-em">🎁</span> Box of blocks</h2>',
      '    <p class="fs-hint">Tap a block to add it to your program.</p>',
      '    <div class="fs-palgroup">Moves</div>',
      '    <div id="fsPalMoves"></div>',
      '    <div class="fs-palgroup">Ifs — for when something happens</div>',
      '    <div id="fsPalConds"></div>',
      '  </section>',

      '  <section class="fs-card fs-mid">',
      '    <h2><span class="fs-h-em">🚂</span> My program <small id="fsCount"></small>',
      '      <label class="fs-loop"><input type="checkbox" id="fsLoop" checked><span>🔁 Repeat from the start</span></label>',
      '      <span class="fs-loopwarn" id="fsLoopWarn"></span>',
      '      <button class="fs-mini" id="fsClear" type="button">🗑 Clear</button>',
      '    </h2>',
      '    <div class="fs-strip" id="fsStrip"></div>',
      '    <div class="fs-talk">',
      '      <div class="fs-talk-h"><span class="fs-h-em">💬</span> Or type here what it should do',
      '        <span class="fs-offline" title="No internet needed">Offline · a word list, not an AI</span></div>',
      '      <div class="fs-talk-row">',
      '        <textarea id="fsText" rows="2" placeholder="for example: go forward 3 seconds then turn right, and if you bump into something go back"></textarea>',
      '        <button class="fs-go" id="fsGo" type="button">✨<span>Build</span></button>',
      '      </div>',
      '      <div class="fs-chips" id="fsChips"></div>',
      '      <div class="fs-report" id="fsReport"></div>',
      '    </div>',
      '  </section>',

      '  <section class="fs-card fs-code">',
      '    <h2><span class="fs-h-em">🐍</span> My Python file <small>this very file is what runs</small></h2>',
      '    <div class="fs-okline" id="fsOk"></div>',
      '    <pre class="fs-py" id="fsPy"></pre>',
      '  </section>',
      '</div>',
      '<footer class="fs-bottom">',
      '  <button class="fs-btn fs-run" id="fsRun" type="button">▶ Run</button>',
      '  <button class="fs-btn fs-save" id="fsSave" type="button">⬇ Save Python file</button>',
      '  <span class="fs-foot-note">“Run” drops this very code into the red team’s editor and starts the match.</span>',
      '</footer>',
    ].join('');
    document.body.appendChild(d);
    S.el = d;

    /* palette */
    const pm = $('fsPalMoves');
    catMoves().forEach((id) => {
      const M = MOVES[id];
      if (!M) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'fs-pblk';
      b.style.setProperty('--c', M.c); b.style.setProperty('--c2', M.c2);
      b.innerHTML = '<span class="fs-ic">' + ICON[id] + '</span><span class="fs-pname">' + M.fa + '</span><span class="fs-plus">＋</span>';
      b.onclick = () => add(mkMove(id, id === 'turnleft' || id === 'turnright' ? 1 : 2));
      pm.appendChild(b);
    });
    const pc = $('fsPalConds');
    catConds().forEach((id) => {
      const C = CONDS[id];
      if (!C) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'fs-pblk fs-pcond';
      b.style.setProperty('--c', C.c); b.style.setProperty('--c2', C.c2);
      b.innerHTML = '<span class="fs-ic">' + ICON[id] + '</span><span class="fs-pname">' + C.fa + '</span><span class="fs-plus">＋</span>';
      b.onclick = () => add(mkWhen(id, id === 'bump' ? 'backward' : 'turnright', id === 'bump' ? 1 : 0.8, 'green'));
      pc.appendChild(b);
    });

    /* example chips */
    const ch = $('fsChips');
    ch.innerHTML = '<span>Examples:</span>';
    SAMPLES.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'fs-chip'; b.textContent = s;
      b.onclick = () => { $('fsText').value = s; $('fsText').focus(); };
      ch.appendChild(b);
    });

    /* wiring */
    $('fsClose').onclick = close;
    $('fsClear').onclick = () => { S.blocks = []; $('fsReport').innerHTML = ''; render(); };
    $('fsLoop').onchange = () => { S.loop = $('fsLoop').checked; render(); };
    $('fsGo').onclick = talk;
    $('fsText').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); talk(); } });
    $('fsRun').onclick = () => { const py = code(); close(); if (S.onDone) S.onDone(py); };
    $('fsSave').onclick = download;
    document.addEventListener('keydown', (e) => { if (S.open && e.key === 'Escape') close(); });
    return d;
  }

  /* ---------------- the program strip ---------------- */

  function add(b) { S.blocks.push(b); render(); flashLast(); }
  function flashLast() {
    const st = $('fsStrip'), el = st && st.lastElementChild;
    if (!el) return;
    el.classList.add('fs-new');
    st.scrollTop = st.scrollHeight;
    setTimeout(() => el.classList.remove('fs-new'), 500);
  }

  function secBox(b) {
    return '<span class="fs-secs"><button type="button" class="fs-sq" data-act="less">−</button>' +
      '<b>' + faD(pyNum(b.secs)) + '<small>' + (pyNum(b.secs) === '1' ? 'second' : 'seconds') + '</small></b>' +
      '<button type="button" class="fs-sq" data-act="more">+</button></span>';
  }

  function render() {
    const st = $('fsStrip');
    st.innerHTML = '';
    if (!S.blocks.length) {
      st.innerHTML = '<div class="fs-empty"><span class="fs-emptyic">' + ICON.forward + '</span>' +
        '<b>Nothing here yet</b>' +
        '<i>Take a block out of the box, or type below what it should do.</i></div>';
    }
    let num = 0;
    S.blocks.forEach((b, i) => {
      const el = document.createElement('div');
      el._blk = b;
      const isMove = b.t === 'move';
      const M = MOVES[b.act];
      const C = isMove ? null : CONDS[b.cond];
      el.className = 'fs-blk' + (isMove ? '' : ' fs-when');
      el.style.setProperty('--c', isMove ? M.c : C.c);
      el.style.setProperty('--c2', isMove ? M.c2 : C.c2);
      const badge = isMove ? faD(++num) : '⚡';
      let head;
      if (isMove) {
        head = '<span class="fs-ic">' + ICON[b.act] + '</span><span class="fs-bname">' + M.fa + '</span>' + secBox(b);
      } else {
        head = '<span class="fs-ic">' + ICON[b.cond] + '</span><span class="fs-bname">' +
          (b.cond === 'color' ? 'If the floor ahead is …' : C.fa) + '</span>';
      }
      el.innerHTML =
        '<span class="fs-grip" title="Drag me to move me">⠿</span>' +
        '<span class="fs-badge">' + badge + '</span>' +
        '<div class="fs-body"><div class="fs-row1">' + head + '</div>' +
        (isMove ? '' :
          (b.cond === 'color'
            ? '<div class="fs-row2 fs-colors">' + COLORS.map((c) =>
              '<button type="button" class="fs-dot' + (c.id === b.color ? ' on' : '') + '" data-color="' + c.id +
              '" title="' + c.note + '" style="--d:' + c.hex + '"></button>').join('') +
            '<span class="fs-colname">' + COLOR_FA[b.color].fa + ' · ' + COLOR_FA[b.color].note + '</span></div>'
            : '') +
          '<div class="fs-row2"><span class="fs-then">then</span>' +
          MOVE_IDS.map((id) => '<button type="button" class="fs-mv' + (id === b.act ? ' on' : '') +
            '" data-move="' + id + '" title="' + MOVES[id].fa + '" style="--m:' + MOVES[id].c + '">' +
            ICON[id] + '</button>').join('') + secBox(b) + '</div>') +
        '</div>' +
        '<button type="button" class="fs-del" title="Delete">✕</button>';

      el.querySelector('.fs-del').onclick = (e) => { e.stopPropagation(); S.blocks.splice(i, 1); render(); };
      el.querySelectorAll('.fs-sq').forEach((q2) => {
        q2.onclick = (e) => { e.stopPropagation(); b.secs = stepSecs(b.secs, q2.dataset.act === 'more' ? 1 : -1); render(); };
      });
      el.querySelectorAll('.fs-mv').forEach((q2) => {
        q2.onclick = (e) => { e.stopPropagation(); b.act = q2.dataset.move; render(); };
      });
      el.querySelectorAll('.fs-dot').forEach((q2) => {
        q2.onclick = (e) => { e.stopPropagation(); b.color = q2.dataset.color; render(); };
      });
      el.addEventListener('pointerdown', dragStart);
      st.appendChild(el);
    });
    $('fsCount').textContent = S.blocks.length
      ? ('(' + faD(S.blocks.length) + (S.blocks.length === 1 ? ' block)' : ' blocks)')) : '';
    // an honest warning: a robot that just stands there gets moved by the referee
    $('fsLoopWarn').textContent = (!S.loop && S.blocks.some((b) => b.t === 'move'))
      ? '⚠ It stands still after the last job — and the referee moves a robot that stands still.' : '';
    paintCode();
  }

  /* ---------------- drag to reorder ---------------- */

  function dragStart(e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest('button')) return;                 // the small controls win
    const el = e.currentTarget, strip = $('fsStrip');
    S.drag = { el, y0: e.clientY, moved: false };
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* older browser */ }
    const move = (ev) => {
      if (!S.drag) return;
      if (!S.drag.moved && Math.abs(ev.clientY - S.drag.y0) < 6) return;
      if (!S.drag.moved) { S.drag.moved = true; el.classList.add('fs-dragging'); }
      ev.preventDefault();
      for (const other of Array.prototype.slice.call(strip.children)) {
        if (other === el) continue;
        const r = other.getBoundingClientRect();
        if (ev.clientY > r.top && ev.clientY < r.bottom) {
          const after = ev.clientY > r.top + r.height / 2;
          strip.insertBefore(el, after ? other.nextSibling : other);
          break;
        }
      }
    };
    const up = () => {
      el.classList.remove('fs-dragging');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      if (S.drag && S.drag.moved) {
        S.blocks = Array.prototype.slice.call(strip.children).map((c) => c._blk).filter(Boolean);
        render();
      }
      S.drag = null;
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  /* ---------------- the talk box ---------------- */

  function talk() {
    const res = interpret($('fsText').value);
    res.blocks.forEach((b) => S.blocks.push(b));
    render();
    const box = $('fsReport');
    box.innerHTML = '';
    res.lines.forEach((ln) => {
      const row = document.createElement('div');
      row.className = 'fs-rline ' + (ln.ok ? 'ok' : 'bad');
      let html = '<span class="fs-rmark">' + (ln.ok ? '✔' : '🤔') + '</span><span>' + esc(ln.text);
      if (ln.note) html += '<i class="fs-rnote">' + esc(ln.note) + '</i>';
      if (ln.extra) html += '<i class="fs-rnote">I took no notice of these words: ' + esc(ln.extra.join(', ')) + '</i>';
      html += '</span>';
      row.innerHTML = html;
      if (ln.suggest) {
        const s = document.createElement('button');
        s.type = 'button'; s.className = 'fs-fix';
        s.textContent = 'Did you mean “' + blockLabel(ln.suggest.block) + '”? Add it';
        s.onclick = () => { add(ln.suggest.block); s.disabled = true; s.textContent = 'Added ✔'; };
        row.appendChild(s);
      }
      box.appendChild(row);
    });
    if (res.blocks.length) $('fsText').value = '';
  }

  /* ---------------- the python pane ---------------- */

  function code() { return toPython(S.blocks, S.loop); }

  function paintCode() {
    const src = code();
    const html = src.split('\n').map((line) => {
      const h = line.indexOf('#');
      let c = h < 0 ? line : line.slice(0, h);
      const cmt = h < 0 ? '' : line.slice(h);
      c = esc(c)
        .replace(/\b(if|elif|else|and|or|not)\b/g, '<b class="k">$1</b>')
        .replace(/\b(forward|backward|turnleft|turnright|stop)\b(?=\()/g, '<b class="f">$1</b>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<b class="n">$1</b>');
      // one <div> per line, so a long comment wraps with a hanging indent
      // instead of pretending to be a new statement
      return '<div>' + (c + (cmt ? '<b class="c">' + esc(cmt) + '</b>' : '') || '&nbsp;') + '</div>';
    }).join('');
    $('fsPy').innerHTML = html;
    // prove it: run the child's own file through the game's own reader
    const ok = $('fsOk');
    if (root.PyReader) {
      try {
        root.PyReader.compile(src);
        ok.className = 'fs-okline good'; ok.textContent = '✔ This file is healthy — the game can run it';
      } catch (e) {
        ok.className = 'fs-okline bad'; ok.textContent = '✖ ' + e.message;
      }
    } else { ok.className = 'fs-okline'; ok.textContent = ''; }
  }

  function download() {
    const blob = new Blob([code()], { type: 'text/x-python;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'robot-fs.py';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------------- open / close ---------------- */

  function open(opts) {
    opts = opts || {};
    build();
    S.onDone = opts.onDone || null;
    S.cat = opts.catalogue || null;
    if (opts.blocks) S.blocks = opts.blocks.slice();
    // reopening a .py this panel once wrote? pick its blocks straight back up
    if (opts.code && !opts.blocks) {
      const j = stateDecodeFS(opts.code);
      if (j && j.app === 'fsapp' && j.model && Array.isArray(j.model.blocks)) {
        S.blocks = j.model.blocks.slice();
        if (typeof j.model.loop === 'boolean') S.loop = j.model.loop;
      }
    }
    // the league's own headline, so the child knows what THIS game is about
    const sub = $('fsSub');
    if (sub && S.cat && S.cat.intro) sub.textContent = S.cat.intro;
    S.open = true;
    S.el.classList.add('on');
    document.body.classList.add('fs-locked');
    render();
  }
  function close() {
    S.open = false;
    if (S.el) S.el.classList.remove('on');
    document.body.classList.remove('fs-locked');
  }

  const api = { open, close, interpret, toPython, MOVES, CONDS, COLORS, state: S };
  if (typeof root !== 'undefined') root.FSApp = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
