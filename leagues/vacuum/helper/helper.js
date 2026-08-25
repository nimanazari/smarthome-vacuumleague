/* ============================================================
   leagues/vacuum/helper/helper.js  —  the vacuum league's Robot Helper.

   THE LEAGUE'S HELPER MODULE, a page of its own. Any division that
   declares `helper: 'leagues/vacuum/helper/helper.html'` in its
   rules.js gets the 🤖 AI button — today FS (?league=fs) and U14
   (?league=u14, which adds the compass, the room number, the
   clean-% and the Turn-to-° plans).
   It is not the game, it is not the league picker, and nothing in
   the game depends on it: it opens on its own URL, and the only
   thing it ever hands back is a real Python file.

   THE CHILD BUILDS RULES, THE PAGE DOES NOT PRE-BAKE THEM.
   There is no fixed menu of combinations — that would hand every
   team the same algorithm. Instead there are six sensors on the
   picture and a + button:

       drag a sensor onto +  ->  a new rule with that sensor
       drag more sensors in  ->  they are ANDed into the same rule
       ↑ ↓ on a rule         ->  its priority in the if / elif chain
       × on a chip           ->  that sensor leaves the rule

   A rule holds any number of sensors — one colour alone, three
   eyes at once, an eye plus the bumper — and the order of the
   rules IS the order of the Python.

   THE ANSWER IS ANIMATED
   Every rule is simulated in a little room with the same wheel
   maths the match uses (throttle = wheel/25, maxSpeed 1 m/s,
   wheelBase 0.5 m), so "which way is better" is something the
   child watches instead of something he is told.

   THE OUTPUT IS THE PRODUCT: an if / elif chain of real Python
   that pyreader.js compiles and the engine drives.
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const LEAGUE = Q.get('league') || 'fs';
  // U14 opens the same page with MORE robot: the compass (heading), the room
  // number and the clean-% of each room — and the turn-to-a-compass-number
  // move that makes "leave the finished room" a plan a child can click out.
  const U14 = /(^|-)u14$/.test(LEAGUE);
  // ONE language at a time — the page follows the game's shl_lang
  let PAGE_LANG = 'en';
  try { PAGE_LANG = localStorage.getItem('shl_lang') || 'en'; } catch (e) { /* private mode */ }
  document.body.classList.add(PAGE_LANG === 'fa' ? 'lang-fa' : 'lang-en');
  document.documentElement.lang = PAGE_LANG === 'fa' ? 'fa' : 'en';
  document.documentElement.dir = PAGE_LANG === 'fa' ? 'rtl' : 'ltr';
  if (PAGE_LANG === 'fa') {
    document.querySelectorAll('[data-fa]').forEach((el) => { el.textContent = el.getAttribute('data-fa'); });
  }
  const L = (en, fa) => (PAGE_LANG === 'fa' && fa != null ? fa : en);

  const SAVE_KEY = 'shl_helper_' + LEAGUE + '_rules';   // this page's own answers
  const HANDOFF_KEY = 'shl_helper_code';                // how the game receives the file
  const GAME_URL = '../../../index.html';   // back to the game, three folders up

  /* ================================================================
     1. THE MOVES  —  every answer a rule can be given.
     ================================================================ */
  const ICON = {
    forward: '<svg viewBox="0 0 24 24"><path d="M12 3.2 20.4 12h-4.7v8.8H8.3V12H3.6z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M12 20.8 3.6 12h4.7V3.2h7.4V12h4.7z"/></svg>',
    turnright: '<svg viewBox="0 0 24 24"><path d="M5 21v-6.5A5.5 5.5 0 0 1 10.5 9H16V4.5L22.5 11 16 17.5V13h-5.5c-.8 0-1.5.7-1.5 1.5V21z"/></svg>',
    turnleft: '<svg viewBox="0 0 24 24"><path d="M19 21v-6.5A5.5 5.5 0 0 0 13.5 9H8V4.5L1.5 11 8 17.5V13h5.5c.8 0 1.5.7 1.5 1.5V21z"/></svg>',
    backright: '<svg viewBox="0 0 24 24"><path d="M20.4 20.4H9.9l3.3-3.3-6.1-6.1-3.5 3.5V4.1h10.4l-3.5 3.5 6.1 6.1 3.3-3.3z"/></svg>',
    backleft: '<svg viewBox="0 0 24 24"><path d="M3.6 20.4h10.5l-3.3-3.3 6.1-6.1 3.5 3.5V4.1H10l3.5 3.5-6.1 6.1-3.3-3.3z"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><path d="M8.2 2.6h7.6l5.6 5.6v7.6l-5.6 5.6H8.2l-5.6-5.6V8.2z"/></svg>',
    none: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3.4c1.4 0 2.7.4 3.8 1.1L6.5 15.8A6.6 6.6 0 0 1 12 5.4zm0 13.2c-1.4 0-2.7-.4-3.8-1.1l9.3-9.3a6.6 6.6 0 0 1-5.5 10.4z"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M12 4.5C6.9 4.5 2.6 7.6 1 12c1.6 4.4 5.9 7.5 11 7.5s9.4-3.1 11-7.5c-1.6-4.4-5.9-7.5-11-7.5zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>',
    bumpfront: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9h3.4A5.6 5.6 0 0 1 12 6.4 5.6 5.6 0 0 1 17.6 12H21a9 9 0 0 0-9-9z"/><path d="M4 14h16v2.6H4z" opacity=".45"/></svg>',
    bumpback: '<svg viewBox="0 0 24 24"><path d="M12 21a9 9 0 0 0 9-9h-3.4A5.6 5.6 0 0 1 12 17.6 5.6 5.6 0 0 1 6.4 12H3a9 9 0 0 0 9 9z"/><path d="M4 7.4h16V10H4z" opacity=".45"/></svg>',
    paint: '<svg viewBox="0 0 24 24"><rect x="2.4" y="2.4" width="19.2" height="19.2" rx="3" opacity=".42"/><rect x="7.2" y="7.2" width="9.6" height="9.6" rx="1.6"/></svg>',
    combo: '<svg viewBox="0 0 24 24"><circle cx="8.6" cy="12" r="6.1" opacity=".55"/><circle cx="15.4" cy="12" r="6.1" opacity=".55"/><circle cx="12" cy="12" r="2.6"/></svg>',
    compassI: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.8 8.2 13.4 13.4 8.2 15.8 10.6 10.6z"/></svg>',
    roomI: '<svg viewBox="0 0 24 24"><path d="M4 21V5.4L14.6 3v18zM16 6h4v15h-4zM11.6 11.2h1.8v2.4h-1.8z"/></svg>',
    cleanI: '<svg viewBox="0 0 24 24"><path d="M6.6 4.2h2.6v2.6H6.6zM4 9h16v2.4H4zM5.4 13h13.2l-1.3 7.8H6.7z" opacity=".85"/><path d="M14.8 3.2 16 5.6l2.4 1.2L16 8l-1.2 2.4L13.6 8l-2.4-1.2 2.4-1.2z"/></svg>',
  };

  // The moves a first robot needs, each one a pair of wheel values worked out
  // from ONE number the child chooses: how hard to spin. A "back away" is a
  // REVERSE WITH A CURVE — the same trick fs/program.py uses — because
  // reversing dead straight drives you back into the very thing you just met.
  //   the robot turns the way (wr - wl) says: bigger right wheel = nose left
  const curve = (s) => Math.max(1, Math.round(s * 0.32));   // the slow wheel of a curve
  const ACTS = {
    turnleft: { label: L('Turn left', 'بچرخ به چپ'), icon: 'turnleft', def: 18, wheels: (s) => [-s, s], why: L('spin on the spot, nose to the left', 'درجا بچرخ، دماغه به چپ') },
    turnright: { label: L('Turn right', 'بچرخ به راست'), icon: 'turnright', def: 18, wheels: (s) => [s, -s], why: L('spin on the spot, nose to the right', 'درجا بچرخ، دماغه به راست') },
    backleft: { label: L('Back away left', 'عقب‌گردِ چپ'), icon: 'backleft', def: 25, wheels: (s) => [-s, -curve(s)], why: L('reverse in a curve — you leave AND you face somewhere new', 'دنده‌عقبِ قوس‌دار — هم دور می‌شوی هم رو به جای تازه') },
    backright: { label: L('Back away right', 'عقب‌گردِ راست'), icon: 'backright', def: 25, wheels: (s) => [-curve(s), -s], why: L('reverse in a curve — you leave AND you face somewhere new', 'دنده‌عقبِ قوس‌دار — هم دور می‌شوی هم رو به جای تازه') },
    back: { label: L('Straight back', 'مستقیم عقب'), icon: 'back', def: 25, wheels: (s) => [-s, -s], why: L('straight back — you leave, but you still face the same thing', 'مستقیم عقب — دور می‌شوی ولی هنوز رو به همان چیزی') },
    forward: { label: L('Drive on', 'برو جلو'), icon: 'forward', def: 25, wheels: (s) => [s, s], why: L('get out of there forwards', 'رو به جلو از آنجا بیرون بزن') },
    stop: { label: L('Stand still', 'بایست'), icon: 'stop', def: 0, wheels: () => [0, 0], why: L('zero and zero — wait where you are', 'صفر و صفر — همان‌جا صبر کن') },
    // U14 only: an ABSOLUTE turn. Not "spin for so long" but "spin until the
    // compass reads my number" — the code it writes checks heading every step.
    turnto: { label: L('Turn to °', 'بچرخ تا °'), icon: 'compassI', def: 18, wheels: (s) => [s, -s], why: L('turn on the spot until the compass reads your number (0 = right, 90 = up, 180 = left, 270 = down)', 'آن‌قدر درجا بچرخ تا قطب‌نما عدد تو را نشان بدهد (۰ راست، ۹۰ بالا، ۱۸۰ چپ، ۲۷۰ پایین)') },
  };
  const ACT_IDS = (U14 ? ['turnto'] : []).concat(['turnleft', 'turnright', 'backleft', 'backright', 'back', 'forward', 'stop']);
  // the four compass directions, as the game counts them (0 = right, CCW)
  const DIRS = [
    { d: 0, ar: '\u2192', fa: 'right' }, { d: 90, ar: '\u2191', fa: 'up' },
    { d: 180, ar: '\u2190', fa: 'left' }, { d: 270, ar: '\u2193', fa: 'down' },
  ];

  /* ---- how far a move actually turns you ----
     Straight out of physics.js: a wheel value of 25 is maxSpeed (1 m/s) and the
     wheels are wheelBase (0.5 m) apart, so
         omega = ((wr - wl) / 25) / 0.5  rad/s      ->  * 180/PI  degrees
         v     =  (wr + wl) / 2 / 25     m/s
     Wheels 18 / −18 for one second therefore come out at about 165°, which is
     exactly the number fs/program.py has always told the children. */
  const DEG_PER_DIFF = (180 / Math.PI) / (25 * 0.5);      // 4.58 deg per unit per second
  function motion(act, speed, secs) {
    const w = ACTS[act].wheels(speed);
    return {
      wl: w[0], wr: w[1],
      deg: Math.abs(w[1] - w[0]) * DEG_PER_DIFF * secs,
      cm: Math.abs((w[0] + w[1]) / 2) / 25 * 100 * secs,
      steps: Math.max(1, Math.round(secs * 10)),
    };
  }

  // the floor colours the colour sensor reports (the ids ARE the Python names)
  const COLORS = [
    { id: 'white', label: 'white', hex: '#f8fafc', note: L('floor nobody has cleaned yet', 'کفِ تمیز‌نشده') },
    { id: 'green', label: 'green', hex: '#22c55e', note: L('the big rug - half speed, no points', 'فرش بزرگ — نصف سرعت، بی‌امتیاز') },
    { id: 'purple', label: 'purple', hex: '#a855f7', note: L('the small rug - no points', 'فرش کوچک — بی‌امتیاز') },
    { id: 'black', label: 'black', hex: '#111827', note: L('a wall or furniture right ahead', 'دیوار یا مبلمانِ درست جلوی رو') },
    { id: 'red', label: 'red', hex: '#ef4444', note: L('already cleaned by the red robot', 'قبلاً ربات قرمز تمیزش کرده') },
    { id: 'blue', label: 'blue', hex: '#3b82f6', note: L('already cleaned by the blue robot', 'قبلاً ربات آبی تمیزش کرده') },
    { id: 'orange', label: 'orange', hex: '#f59e0b', note: L('an orange marker rug - no points', 'فرش نشانه‌ی نارنجی — بی‌امتیاز') },
    { id: 'cyan', label: 'cyan', hex: '#22d3ee', note: L('a cyan marker rug - no points', 'فرش نشانه‌ی فیروزه‌ای — بی‌امتیاز') },
  ];
  const colorOf = (id) => COLORS.filter((c) => c.id === id)[0] || COLORS[0];
  // what a first robot should usually do about each colour. white is the whole
  // point of the match, so the honest answer there is "nothing, drive on".
  const COLOR_BEST = { white: 'forward', green: 'back', purple: 'back', black: 'backright', red: 'forward', blue: 'forward', orange: 'back', cyan: 'back' };

  const CM = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 85, 100, 120, 150];
  const SECS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.5, 2, 2.5, 3];
  const SPD = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25];   // wheel numbers, as the Python writes them
  const ladder = (arr, v, dir) => {
    let i = 0, best = 1e9;
    arr.forEach((s, k) => { const d = Math.abs(s - v); if (d < best) { best = d; i = k; } });
    return arr[Math.max(0, Math.min(arr.length - 1, i + dir))];
  };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const num1 = (n) => String(Math.round(n * 10) / 10);
  // the .py file this page writes stays plain ASCII: it is downloaded, opened
  // in whatever editor the venue has, and pasted around — a stray ° or — is
  // exactly the character that comes back as a mojibake box
  const ascii = (s) => String(s).replace(/°/g, ' deg').replace(/[—–]/g, '-');
  const pad = (s, n) => (s.length >= n ? s + ' ' : s + new Array(n - s.length + 1).join(' '));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ================================================================
     2. THE SENSORS WE REALLY HAVE  —  from kit.js next door, the
        same object fs/rules.js hands the engine as `kit:`. These are
        the PIECES; they carry no rules of their own.
     ================================================================ */
  const FS_KIT = (typeof self !== 'undefined' && self.VacuumFsKit) || null;
  function readLoadout() {
    if (FS_KIT) return RobotParts.Loadout.from(FS_KIT);
    return new RobotParts.Loadout();                      // kit.js missing: stock rig
  }

  // where a sensor points, in words a child can check against the picture
  function whereLabel(a) {
    const d = Math.round(Math.abs(a));
    if (d <= 8) return 'straight ahead';
    const side = a > 0 ? 'left' : 'right';
    if (d >= 172) return 'straight behind';
    if (d > 120) return 'behind, to the ' + side;
    if (d > 60) return 'out to the ' + side;
    return d + '° to the ' + side;
  }

  function defaultCm(a) {
    if (Math.abs(a) <= 12) return 75;
    if (Math.abs(a) <= 60) return 45;
    return 35;
  }

  const TITLES = {
    front: 'the front eye', frontleft: 'the front-left eye', frontright: 'the front-right eye',
  };

  function buildSensors(kit) {
    const list = [];
    const slots = kit.classicSlots();
    const named = {};
    for (const k in slots) if (slots[k]) named[slots[k].uid] = RobotParts.CLASSIC_NAMES[k];
    kit.rays().forEach((p, i) => {
      const py = named[p.uid] || ('dist' + (i + 1));
      list.push({
        id: py, kind: 'dist', py: py, angle: p.angle, icon: 'eye', color: '#4d8bff',
        title: TITLES[py] || ('eye ' + (i + 1)), defCm: defaultCm(p.angle),
      });
    });
    if (kit.has('bumper')) {
      list.push({ id: 'bumpfront', kind: 'bump', py: 'bumperfront', angle: 0, icon: 'bumpfront', color: '#ffd23b', title: 'the front bumper' });
      list.push({ id: 'bumpback', kind: 'bump', py: 'bumperback', angle: 180, icon: 'bumpback', color: '#fb923c', title: 'the back bumper' });
    }
    if (kit.has('color')) {
      list.push({ id: 'color', kind: 'color', py: 'color', angle: 0, icon: 'paint', color: '#b07ae8', title: 'the colour sensor' });
    }
    if (U14) {
      // U14's extra senses. The compass is a part on the shell; room and
      // clean-% are what the HOUSE tells the robot on maps with rooms.
      list.push({ id: 'compass', kind: 'compass', py: 'heading', angle: 0, icon: 'compassI', color: '#f472b6', title: 'the compass (0 = right, 90 = up, 180 = left, 270 = down)' });
      list.push({ id: 'room', kind: 'room', py: 'room', angle: 0, icon: 'roomI', color: '#34d399', title: 'which room I am in (0 hall - 1 kitchen - 2/3/4 bedrooms - 5 bathroom)' });
      list.push({ id: 'clean', kind: 'clean', py: 'clean', angle: 0, icon: 'cleanI', color: '#fbbf24', title: 'how much of a room wears MY colour, 0..100 %' });
    }
    return list;
  }

  const FA_TITLES = {
    front: 'چشم فاصله‌ی جلو (سانتی‌متر)', frontleft: 'چشم جلو-چپ', frontright: 'چشم جلو-راست',
    bumpfront: 'بامپر جلو — لمس', bumpback: 'بامپر عقب — لمس', color: 'سنسور رنگِ زیر ربات',
    compass: 'قطب‌نما (۰ راست، ۹۰ بالا، ۱۸۰ چپ، ۲۷۰ پایین)',
    room: 'شماره‌ی اتاقی که تویش هستم (۰ هال، ۱ آشپزخانه، ۲/۳/۴ اتاق‌خواب، ۵ سرویس)',
    clean: 'چند درصد یک اتاق رنگِ من است (۰ تا ۱۰۰)',
  };
  const faTitle = (sn) => (PAGE_LANG === 'fa' && FA_TITLES[sn.id]) ? FA_TITLES[sn.id] : sn.title;

  const KIT = readLoadout();
  const SENSORS = buildSensors(KIT);
  const sensorOf = (id) => SENSORS.filter((s) => s.id === id)[0] || null;

  /* ================================================================
     3. THE RULES  —  the child's own, in the child's own order.
        A rule = any set of sensors + one answer. Its place in the
        list IS its place in the if / elif chain.
     ================================================================ */
  let RULES = [];
  const DRIVE = { speed: 25 };          // the `else` at the bottom of the file
  let ruleUid = 1;
  let sel = null;                       // a rule id, 'drive', or nothing yet
  const ruleOf = (id) => RULES.filter((r) => r.id === id)[0] || null;

  // which way is smart for THIS set of sensors: away from where they point
  function bestActFor(r) {
    const ms = r.members.map(sensorOf).filter(Boolean);
    // a room / clean-% rule is an EXIT rule: face a direction and go
    if (U14 && ms.some((s) => s.kind === 'room' || s.kind === 'clean')) return 'turnto';
    if (U14 && ms.some((s) => s.kind === 'compass')) return 'forward';
    if (ms.some((s) => s.id === 'bumpback')) return 'forward';   // pressed from behind: leave forwards
    const ds = ms.filter((s) => s.kind === 'dist');
    if (ds.length) {
      const a = ds.reduce((t, s) => t + s.angle, 0) / ds.length;
      if (Math.abs(a) <= 12) return 'backright';
      if (Math.abs(a) > 60) return a > 0 ? 'turnright' : 'turnleft';
      return a > 0 ? 'backright' : 'backleft';
    }
    if (ms.some((s) => s.id === 'bumpfront')) return 'backright';
    if (ms.some((s) => s.kind === 'color')) return COLOR_BEST[r.colorPick] || 'back';
    return 'backright';
  }

  function newRule(members) {
    const r = {
      id: 'r' + (ruleUid++), members: (members || []).slice(),
      cm: 60, colorPick: 'purple', secs: 0.5, on: true,
      act2: null, secs2: 0.5, speed2: 18,      // the optional SECOND move
      act3: null, secs3: 0.5, speed3: 18,      // U14: an optional THIRD move
      dir: 90,                                 // compass condition: facing which way
      roomPick: 2, cleanRoom: 2, cleanPct: 80, // room / clean-% conditions
      deg: 270, deg2: 180, deg3: 270,          // turn-to targets, per move
    };
    tuneRule(r);
    return r;
  }
  // sensible starting numbers that FOLLOW the sensors in the rule —
  // the child then edits whatever he likes
  function tuneRule(r) {
    r.act = bestActFor(r);
    r.speed = ACTS[r.act].def;
    const ds = r.members.map(sensorOf).filter((s) => s && s.kind === 'dist');
    if (ds.length === 1) r.cm = ds[0].defCm;
    else if (ds.length > 1) r.cm = 60;
    if (r.members.length === 1 && sensorOf(r.members[0]).kind === 'bump') r.secs = 0.6;
  }

  function createRuleWith(sensorId) {
    const r = newRule(sensorId ? [sensorId] : []);
    RULES.unshift(r);                 // a new rule lands on TOP: asked first,
    sel = r.id;                       // and one drag away from anywhere else
    resetSim(); refresh();
    return r;
  }
  function addSensorTo(ruleId, sensorId) {
    const r = ruleOf(ruleId);
    if (!r || !sensorOf(sensorId)) return;
    const i = r.members.indexOf(sensorId);
    if (i >= 0) r.members.splice(i, 1);          // already in: the same gesture takes it out
    else { r.members.push(sensorId); tuneRule(r); }
    sel = r.id;
    resetSim(); refresh();
  }
  function moveRule(ruleId, dir) {
    const i = RULES.map((r) => r.id).indexOf(ruleId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= RULES.length) return;
    const t = RULES[i]; RULES[i] = RULES[j]; RULES[j] = t;
    refresh();
  }
  function deleteRule(ruleId) {
    RULES = RULES.filter((r) => r.id !== ruleId);
    if (sel === ruleId) sel = null;
    resetSim(); refresh();
  }

  const usedAnywhere = (sensorId) => RULES.some((r) => r.members.indexOf(sensorId) >= 0);

  function save() {
    const out = {
      drive: DRIVE.speed,
      rules: RULES.map((r) => ({ members: r.members, cm: r.cm, colorPick: r.colorPick, act: r.act, secs: r.secs, speed: r.speed, on: r.on, act2: r.act2, secs2: r.secs2, speed2: r.speed2, act3: r.act3, secs3: r.secs3, speed3: r.speed3, dir: r.dir, roomPick: r.roomPick, cleanRoom: r.cleanRoom, cleanPct: r.cleanPct, deg: r.deg, deg2: r.deg2, deg3: r.deg3 })),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(out)); } catch (e) { /* private mode */ }
  }
  function restore() {
    let j = null;
    try { j = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { /* private mode */ }
    if (!j || !Array.isArray(j.rules)) return;
    if (j.drive) DRIVE.speed = clamp(Math.round(j.drive), 1, 25);
    j.rules.forEach((s) => {
      if (!s || !Array.isArray(s.members)) return;
      const members = s.members.filter((id) => sensorOf(id));
      const r = newRule(members);
      if (s.act && ACTS[s.act]) { r.act = s.act; r.speed = ACTS[s.act].def; }
      if (s.speed) r.speed = clamp(Math.round(s.speed), 1, 25);
      if (s.cm) r.cm = clamp(Math.round(s.cm), 5, 200);
      if (s.secs) r.secs = clamp(s.secs, 0.1, 6);
      if (s.colorPick && colorOf(s.colorPick).id === s.colorPick) r.colorPick = s.colorPick;
      if (typeof s.on === 'boolean') r.on = s.on;
      if (s.act2 && ACTS[s.act2]) { r.act2 = s.act2; r.speed2 = clamp(Math.round(s.speed2 || 18), 1, 25); r.secs2 = clamp(s.secs2 || 0.5, 0.1, 6); }
      if (s.act3 && ACTS[s.act3]) { r.act3 = s.act3; r.speed3 = clamp(Math.round(s.speed3 || 18), 1, 25); r.secs3 = clamp(s.secs3 || 0.5, 0.1, 6); }
      if (isFinite(s.dir)) r.dir = ((Math.round(s.dir) % 360) + 360) % 360;
      if (isFinite(s.roomPick)) r.roomPick = clamp(Math.round(s.roomPick), 0, 5);
      if (isFinite(s.cleanRoom)) r.cleanRoom = clamp(Math.round(s.cleanRoom), 1, 5);
      if (isFinite(s.cleanPct)) r.cleanPct = clamp(Math.round(s.cleanPct), 5, 99);
      ['deg', 'deg2', 'deg3'].forEach((k) => { if (isFinite(s[k])) r[k] = ((Math.round(s[k]) % 360) + 360) % 360; });
      RULES.push(r);
    });
  }
  restore();

  /* ================================================================
     4. THE PICTURE  —  the robot from above: the six pieces a rule
        can be built from. Tap one to drop it into the selected rule
        (or start a new one); DRAG one onto a rule, onto +, or onto
        the big panel to put it exactly where you want it.
     ================================================================ */
  const D2R = Math.PI / 180;
  const dirX = (a) => -Math.sin(a * D2R);
  const dirY = (a) => -Math.cos(a * D2R);

  /* Rings, so no two sensors ever share a patch of screen:
       0–46 body + colour square · 52–64 the bumper ring ·
       69–126 the eyes · 142 the names.
     Every sensor also carries an invisible target far bigger than
     its artwork, so half a ring is as easy to grab as an eye. */
  function drawDiagram() {
    const SHELL = 46, RING = 58, EYE = 78, BEAM = 48, LBL = 142, w = 13;
    const selRule = ruleOf(sel);
    const inSel = (id) => !!(selRule && selRule.members.indexOf(id) >= 0);
    const s = [];
    s.push('<svg viewBox="-160 -162 320 320" role="img" aria-label="the robot from above">');

    // ---- the body: a shaded shell, two wheels, a lit nose ----
    s.push('<defs>' +
      '<radialGradient id="shellg" cx="38%" cy="32%" r="80%">' +
        '<stop offset="0%" stop-color="#33425f"/><stop offset="55%" stop-color="#233049"/><stop offset="100%" stop-color="#161f30"/>' +
      '</radialGradient>' +
      '<linearGradient id="noseg" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#9fd0ff"/><stop offset="100%" stop-color="#4d8bff"/>' +
      '</linearGradient></defs>');
    s.push('<circle cx="0" cy="3" r="' + (SHELL + 2) + '" fill="#000" opacity=".35"/>');   // its shadow
    s.push('<circle cx="0" cy="0" r="' + SHELL + '" fill="url(#shellg)" stroke="#465a80" stroke-width="2"/>');
    // the two drive wheels, seen from above
    s.push('<rect x="-40" y="-15" width="9" height="30" rx="4" fill="#0d1420" stroke="#3a4a68" stroke-width="1.5"/>');
    s.push('<rect x="31" y="-15" width="9" height="30" rx="4" fill="#0d1420" stroke="#3a4a68" stroke-width="1.5"/>');
    // the nose: a lit chevron instead of a bare notch
    s.push('<path d="M -11 ' + (-SHELL + 15) + ' L 0 ' + (-SHELL + 3) + ' L 11 ' + (-SHELL + 15) + ' L 0 ' + (-SHELL + 11) + ' Z" fill="url(#noseg)"/>');

    const col = sensorOf('color');
    if (col) {
      const hot = inSel('color');
      s.push('<g class="pick' + (hot ? ' hot' : '') + '" data-sensor="color">');
      s.push('<rect x="-24" y="-24" width="48" height="48" fill="transparent" pointer-events="all"/>');
      s.push('<rect x="-17" y="-17" width="34" height="34" rx="3" pointer-events="none" fill="' + col.color +
        '" opacity="' + (hot ? 1 : (usedAnywhere('color') ? .6 : .34)) + '" stroke="' + (hot ? '#eaf7ff' : '#0a0d13') + '" stroke-width="' + (hot ? 3 : 2) + '"/>');
      s.push('<text x="0" y="34" text-anchor="middle" font-size="10.5" pointer-events="none" ' +
        'font-family="Consolas, monospace" fill="' + (hot ? '#eaf7ff' : '#5b6880') + '">COLOR</text>');
      s.push('</g>');
    }

    // ---- the bumper ring: its own band, outside the body, under the eyes ----
    const arc = (id, sweep, lx, ly) => {
      const sn = sensorOf(id);
      if (!sn) return;
      const hot = inSel(id);
      const d = 'M ' + RING + ',0 A ' + RING + ',' + RING + ' 0 0 ' + sweep + ' ' + (-RING) + ',0';
      s.push('<g class="pick' + (hot ? ' hot' : '') + '" data-sensor="' + id + '">');
      s.push('<path d="' + d + '" fill="none" stroke="transparent" stroke-width="22" ' +
        'stroke-linecap="round" pointer-events="stroke"/>');
      s.push('<path d="' + d + '" fill="none" pointer-events="none" ' +
        'stroke="' + sn.color + '" stroke-width="' + (hot ? 13 : 9) + '" stroke-linecap="round" ' +
        'opacity="' + (hot ? .95 : (usedAnywhere(id) ? .48 : .18)) + '"/>');
      s.push('<text x="' + lx + '" y="' + ly + '" text-anchor="middle" font-size="10.5" pointer-events="none" ' +
        'font-family="Consolas, monospace" fill="' + (hot ? '#eaf7ff' : '#5b6880') + '">' + esc(sn.py.toUpperCase()) + '</text>');
      s.push('</g>');
    };
    arc('bumpfront', 0, 108, -22);
    arc('bumpback', 1, 0, RING + 30);

    // ---- the eyes: chips and beams, all of it clear of the ring ----
    SENSORS.forEach((sn) => {
      if (sn.kind !== 'dist') return;
      const px = dirX(sn.angle), py = dirY(sn.angle);
      const qx = -Math.cos(sn.angle * D2R), qy = Math.sin(sn.angle * D2R);   // perpendicular
      const ax = px * EYE, ay = py * EYE;
      const fx = px * (EYE + BEAM), fy = py * (EYE + BEAM);
      const hot = inSel(sn.id);
      const c = hot ? '#4fc3f7' : (usedAnywhere(sn.id) ? '#3f6fb5' : '#3a465c');
      const pts = (hw, tw) => [ax + qx * hw, ay + qy * hw, fx + qx * tw, fy + qy * tw,
        fx - qx * tw, fy - qy * tw, ax - qx * hw, ay - qy * hw].map((n) => n.toFixed(1)).join(' ');
      s.push('<g class="pick' + (hot ? ' hot' : '') + '" data-sensor="' + sn.id + '">');
      s.push('<polygon points="' + pts(15, 22) + '" fill="transparent" pointer-events="all"/>');
      s.push('<polygon points="' + pts(0, w) + '" pointer-events="none" fill="' + c + '" opacity="' + (hot ? .6 : .14) + '"/>');
      s.push('<circle class="chip" cx="' + ax.toFixed(1) + '" cy="' + ay.toFixed(1) + '" r="9.5" pointer-events="none" fill="' + c +
        '" opacity="' + (hot ? 1 : .45) + '" stroke="' + (hot ? '#eaf7ff' : '#0a0d13') + '" stroke-width="2"/>');
      s.push('<text x="' + (px * LBL).toFixed(1) + '" y="' + (py * LBL + 4).toFixed(1) + '" text-anchor="middle" ' +
        'font-size="11" pointer-events="none" font-family="Consolas, monospace" ' +
        'fill="' + (hot ? '#eaf7ff' : '#5b6880') + '">' + esc(sn.py.toUpperCase()) + '</text>');
      s.push('</g>');
    });

    // ---- U14's extra senses: three chips under the robot ----
    SENSORS.forEach((sn, i) => {
      if (['compass', 'room', 'clean'].indexOf(sn.kind) < 0) return;
      const cxp = { compass: -95, room: 0, clean: 95 }[sn.kind];
      const cyp = 118;
      const hot = inSel(sn.id);
      s.push('<g class="pick' + (hot ? ' hot' : '') + '" data-sensor="' + sn.id + '">');
      s.push('<rect x="' + (cxp - 32) + '" y="' + (cyp - 20) + '" width="64" height="52" fill="transparent" pointer-events="all"/>');
      s.push('<circle cx="' + cxp + '" cy="' + cyp + '" r="13" pointer-events="none" fill="' + sn.color +
        '" opacity="' + (hot ? 1 : (usedAnywhere(sn.id) ? .65 : .3)) + '" stroke="' + (hot ? '#eaf7ff' : '#0a0d13') + '" stroke-width="2"/>');
      // a NESTED svg needs an explicit size or it swallows the whole diagram
      s.push('<g transform="translate(' + (cxp - 8) + ',' + (cyp - 8) + ') scale(0.67)" fill="#0a0d13" color="#0a0d13" pointer-events="none">' +
        ICON[sn.icon].replace('<svg ', '<svg width="24" height="24" ') + '</g>');
      s.push('<text x="' + cxp + '" y="' + (cyp + 27) + '" text-anchor="middle" font-size="10.5" pointer-events="none" ' +
        'font-family="Consolas, monospace" fill="' + (hot ? '#eaf7ff' : '#5b6880') + '">' + esc(sn.py.toUpperCase()) + '</text>');
      s.push('</g>');
    });

    s.push('</svg>');
    $('diagram').innerHTML = s.join('');
    Array.prototype.forEach.call($('diagram').querySelectorAll('.pick'), (g) => {
      g.addEventListener('pointerdown', (e) => startDrag(e, g.getAttribute('data-sensor')));
    });
  }

  /* ---- drag & drop: pointer events, so mouse and finger both work ----
     A press that never travels is a TAP: it drops the sensor into the
     selected rule (or starts a new rule). A press that travels grows a
     little chip under the pointer; letting go over a rule row adds it
     THERE, over + starts a new rule with it. ---- */
  let drag = null;
  function startDrag(e, sensorId) {
    e.preventDefault();
    drag = { sid: sensorId, x0: e.clientX, y0: e.clientY, moved: false, ghost: null };
  }
  function dropTargetAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const row = el.closest('.srow[data-rule]');
    if (row) return { kind: 'rule', id: row.getAttribute('data-rule'), el: row };
    if (el.closest('#addRule')) return { kind: 'new', el: $('addRule') };
    if (el.closest('#askCard')) return { kind: 'ask', el: $('askCard') };
    return null;
  }
  let dropMark = null;
  function markDrop(t) {
    if (dropMark && (!t || dropMark !== t.el)) { dropMark.classList.remove('droptgt'); dropMark = null; }
    if (t && dropMark !== t.el) { dropMark = t.el; dropMark.classList.add('droptgt'); }
  }
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) {
      drag.moved = true;
      const g = document.createElement('div');
      g.className = 'ghostchip';
      g.textContent = sensorOf(drag.sid).py;
      document.body.appendChild(g);
      drag.ghost = g;
      document.body.classList.add('dragging');
    }
    if (drag.ghost) {
      drag.ghost.style.left = e.clientX + 'px';
      drag.ghost.style.top = e.clientY + 'px';
      markDrop(dropTargetAt(e.clientX, e.clientY));
    }
  });
  window.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    markDrop(null);
    document.body.classList.remove('dragging');
    if (d.ghost) {
      d.ghost.remove();
      const t = dropTargetAt(e.clientX, e.clientY);
      if (!t) return;
      if (t.kind === 'rule') addSensorTo(t.id, d.sid);
      else if (t.kind === 'new') createRuleWith(d.sid);
      else if (ruleOf(sel)) addSensorTo(sel, d.sid);
      else createRuleWith(d.sid);
    } else {
      // a plain tap: into the selected rule, or a brand-new one
      if (ruleOf(sel)) addSensorTo(sel, d.sid);
      else createRuleWith(d.sid);
    }
  });

  /* ================================================================
     5. THE LIST  —  the child's rules, in the child's order, plus
        the + and the `else` that is always there.
     ================================================================ */
  const SHORT = { front: 'F', frontleft: 'FL', frontright: 'FR', bumpfront: 'BF', bumpback: 'BB', color: 'CS', compass: 'HD', room: 'RM', clean: 'CL' };
  // ONE sensor is written out in full; the moment a second one joins, the rule
  // shrinks to capital initials (F+FL, F+FL+FR+CS...). Hovering the row — or
  // tapping it, which lights the sensors up on the picture — tells the story.
  const ruleName = (r) => {
    if (!r.members.length) return 'empty rule';
    if (r.members.length === 1) return sensorOf(r.members[0]).py.toUpperCase();
    return r.members.map((id) => SHORT[id] || id.toUpperCase()).join('+');
  };
  const ruleLong = (r) => (r.members.length ? r.members.map((id) => sensorOf(id).py).join(' + ') : 'no sensor in it yet');
  const ruleIcon = (r) => (r.members.length > 1 ? 'combo' : (r.members.length ? sensorOf(r.members[0]).icon : 'none'));
  const ruleColor = (r) => (r.members.length > 1 ? '#c084fc' : (r.members.length ? sensorOf(r.members[0]).color : '#8e9ab0'));

  function summaryOf(r) {
    if (!r.on) return L('off', 'خاموش');
    if (!r.members.length) return L('no sensor yet', 'هنوز سنسور ندارد');
    if (r.act === 'turnto') {
      const extra = legsOf(r).length - 1;
      return L('face ', 'رو کن به ') + r.deg + '°' + (extra ? ' +' + extra + L(' step' + (extra > 1 ? 's' : ''), ' حرکت') : '');
    }
    const m = motion(r.act, r.speed, r.secs);
    return ACTS[r.act].label + (m.deg >= 1 ? ' · ' + Math.round(m.deg) + '°' : '');
  }

  function drawList() {
    $('kitLine').textContent = (typeof PAGE_LANG !== 'undefined' && PAGE_LANG === 'fa')
      ? SENSORS.length + ' سنسور روی ربات است. روی یکی بزن تا داخل قانونِ انتخاب‌شده بیفتد، یا بکشش روی یک قانون، روی +، یا روی تابلوی بزرگ. ترتیب قانون‌ها همان ترتیبی است که ربات می‌پرسدشان.'
      : SENSORS.length +
      ' sensors on the robot. Tap one to drop it into the selected rule, or DRAG it onto a rule, ' +
      'onto +, or onto the big panel. The order of the rules is the order the robot asks them in.';

    const box = $('sensList');
    box.innerHTML = '';
    RULES.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'srow' + (r.id === sel ? ' sel' : '') + (r.on ? '' : ' off');
      row.setAttribute('data-rule', r.id);

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sname';
      b.innerHTML =
        '<span class="sdot" style="color:' + ruleColor(r) + '">' + ICON[ruleIcon(r)] + '</span>' +
        '<code>' + esc(ruleName(r)) + '</code>' +
        '<span class="sact">' + esc(summaryOf(r)) + '</span>';
      b.title = ruleLong(r) + ' → ' + ACTS[r.act].label;
      b.onclick = () => { if (rowDrag && rowDrag.done) return; select(r.id); refresh(); };
      b.addEventListener('pointerdown', (e) => startRowDrag(e, r.id));

      // the priority NUMBER is a box you can TYPE in: write 2 and this rule
      // becomes second — everything else shuffles around it
      const ridx = document.createElement('input');
      ridx.className = 'ridx';
      ridx.type = 'text';
      ridx.inputMode = 'numeric';
      ridx.value = String(i + 1);
      ridx.title = 'its place in the chain - type a new number to move it';
      ridx.onclick = (e) => { e.stopPropagation(); ridx.select(); };
      ridx.onpointerdown = (e) => e.stopPropagation();
      ridx.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); ridx.blur(); } };
      ridx.onchange = () => {
        const v = parseInt(ridx.value, 10);
        if (!isFinite(v)) { refresh(); return; }
        const from = RULES.map((x) => x.id).indexOf(r.id);
        const to = clamp(v - 1, 0, RULES.length - 1);
        if (from !== to) { const t = RULES.splice(from, 1)[0]; RULES.splice(to, 0, t); }
        sel = r.id;
        refresh();
      };
      row.appendChild(ridx);
      row.appendChild(b);

      // priority: a rule higher up is asked first — these two are the ladder
      const btns = document.createElement('span');
      btns.className = 'rbtns';
      const mk = (label, title, fn, dis) => {
        const x = document.createElement('button');
        x.type = 'button'; x.textContent = label; x.title = title; x.disabled = !!dis;
        x.onclick = (e) => { e.stopPropagation(); fn(); };
        btns.appendChild(x);
      };
      mk('↑', 'ask this rule earlier', () => moveRule(r.id, -1), i === 0);
      mk('↓', 'ask this rule later', () => moveRule(r.id, +1), i === RULES.length - 1);
      mk('×', 'throw this rule away', () => deleteRule(r.id));
      row.appendChild(btns);

      const lab = document.createElement('label');
      lab.className = 'stog';
      lab.title = r.on ? 'this rule is in the file — tap to keep it but leave it out' : 'kept but not in the file — tap to use it';
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!r.on;
      chk.onchange = () => { r.on = chk.checked; select(r.id); refresh(); };
      lab.appendChild(chk);
      row.appendChild(lab);

      box.appendChild(row);
    });

    // the `else`: always there, always last — it cannot be a rule
    const dr = document.createElement('div');
    dr.className = 'srow' + (sel === 'drive' ? ' sel' : '');
    const db = document.createElement('button');
    db.type = 'button';
    db.className = 'sname';
    db.innerHTML =
      '<span class="ridx">&#8734;</span>' +
      '<span class="sdot" style="color:#22c55e">' + ICON.forward + '</span>' +
      '<code>else</code>' +
      '<span class="sact">speed ' + DRIVE.speed + '</span>';
    db.onclick = () => { select('drive'); refresh(); };
    dr.appendChild(db);
    const tag = document.createElement('span');
    tag.className = 'salways';
    tag.textContent = 'always';
    dr.appendChild(tag);
    box.appendChild(dr);
  }

  /* ---- reordering by hand: grab a rule row and PULL it up or down.
     The array is reordered live while the pointer moves, so the child
     watches priority change instead of reading about it. The ↑ ↓
     buttons stay for one-tap nudges. ---- */
  let rowDrag = null;
  function startRowDrag(e, ruleId) {
    rowDrag = { rid: ruleId, y0: e.clientY, moved: false, done: false };
  }
  window.addEventListener('pointermove', (e) => {
    if (!rowDrag || rowDrag.done) return;
    if (!rowDrag.moved && Math.abs(e.clientY - rowDrag.y0) > 7) {
      rowDrag.moved = true;
      document.body.classList.add('rowdragging');
    }
    if (!rowDrag.moved) return;
    // where between the rows is the pointer? move the rule there, live
    const rows = Array.prototype.slice.call(document.querySelectorAll('.srow[data-rule]'));
    const cur = RULES.map((r) => r.id).indexOf(rowDrag.rid);
    let to = cur;
    rows.forEach((el, idx) => {
      const rc = el.getBoundingClientRect();
      if (e.clientY > rc.top + rc.height / 2) to = idx;
    });
    if (rows[0] && e.clientY < rows[0].getBoundingClientRect().top) to = 0;
    if (to !== cur && to >= 0 && to < RULES.length) {
      const t = RULES.splice(cur, 1)[0];
      RULES.splice(to, 0, t);
      sel = rowDrag.rid;
      drawList();                          // light re-render mid-drag
      const el = document.querySelector('.srow[data-rule="' + rowDrag.rid + '"]');
      if (el) el.classList.add('lifting');
    }
  });
  window.addEventListener('pointerup', () => {
    if (!rowDrag) return;
    const wasMoved = rowDrag.moved;
    rowDrag.done = true;
    document.body.classList.remove('rowdragging');
    if (wasMoved) refresh();
    setTimeout(() => { rowDrag = null; }, 0);   // let the click see .done first
  });

  /* ================================================================
     6. THE PANEL  —  the selected rule, and it alone.
     ================================================================ */
  function drawAsk() {
    const box = $('askCard');
    box.innerHTML = '';

    if (sel === 'drive') { drawDrivePanel(box); return; }
    const r = ruleOf(sel);

    if (!r) {
      box.className = 'card askcard empty';
      box.innerHTML =
        '<div class="emptybox"><span class="ehand">&#128072;</span>' +
        '<b>' + L('Make a rule', 'یک قانون بساز') + '</b>' +
        '<p>' + L('Tap a sensor on the picture — or press <b>+ New rule</b> and drag sensors in. ' +
        'One sensor makes a simple rule; drop MORE sensors into the same rule and they must ' +
        'ALL see something at once for it to fire. Your rules, your order, your robot.',
        'روی یکی از سنسورهای عکس بزن — یا <b>+ قانون جدید</b> را بزن و سنسورها را بکش داخلش. ' +
        'یک سنسور یعنی یک قانون ساده؛ چند سنسور در یک قانون یعنی باید همه با هم چیزی ببینند تا روشن شود. ' +
        'قانون‌هایت، ترتیبت، رباتت.') + '</p></div>';
      return;
    }

    const best = bestActFor(r);
    box.className = 'card askcard' + (r.on ? '' : ' off');

    // header: WHICH sensors make this rule — each one removable, more droppable
    const head = document.createElement('div');
    head.className = 'ahead';
    head.innerHTML =
      '<span class="adot" style="color:' + ruleColor(r) + '">' + ICON[ruleIcon(r)] + '</span>' +
      '<span><span class="aname">' + L('Rule ', 'قانون ') + (RULES.indexOf(r) + 1) + '</span>' +
      '<div class="awhere">' + (r.members.length > 1 ? L('ALL of these at once — that is one and in the Python', 'همه‌ی این‌ها با هم — در پایتون یعنی یک and') :
        (r.members.length ? esc(faTitle(sensorOf(r.members[0]))) : L('no sensor in it yet', 'هنوز سنسوری تویش نیست'))) + '</div></span>' +
      '<label class="ronoff"><input type="checkbox"' + (r.on ? ' checked' : '') + '> ' + L('use this rule', 'این قانون به کار برود') + '</label>';
    head.querySelector('input').onchange = (e) => { r.on = e.target.checked; refresh(); };
    box.appendChild(head);

    const chips = document.createElement('div');
    chips.className = 'mchips';
    r.members.forEach((id) => {
      const sn = sensorOf(id);
      const c = document.createElement('span');
      c.className = 'mchip';
      c.innerHTML = '<i style="color:' + sn.color + '">' + ICON[sn.icon] + '</i>' + esc(sn.py.toUpperCase()) +
        '<button type="button" title="take this sensor out">&times;</button>';
      c.querySelector('button').onclick = () => addSensorTo(r.id, id);   // the same toggle
      chips.appendChild(c);
    });
    const hint = document.createElement('span');
    hint.className = 'mhint';
    hint.textContent = r.members.length
      ? L('+ tap or drag another sensor from the picture to and it in', '+ سنسور دیگری را از عکس بزن یا بکش تا and شود')
      : L('tap or drag a sensor from the picture into this rule', 'یک سنسور را از عکس بزن یا بکش داخل این قانون');
    chips.appendChild(hint);
    box.appendChild(chips);

    if (!r.members.length) return;

    // if the colour sensor is in the rule, WHICH colour is part of the question
    const hasColor = r.members.indexOf('color') >= 0;
    if (hasColor) {
      const when = document.createElement('div');
      when.className = 'rwhen';
      when.appendChild(txt(L('The floor colour this rule waits for:', 'این قانون منتظرِ کدام رنگِ کف است:')));
      const cc = document.createElement('div');
      cc.className = 'chips';
      COLORS.forEach((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip2' + (r.colorPick === c.id ? ' on sel' : '');
        b.innerHTML = '<i style="background:' + c.hex + '"></i>' + esc(c.label);
        b.title = c.note;
        b.onclick = () => { r.colorPick = c.id; refresh(); };
        cc.appendChild(b);
      });
      when.appendChild(cc);
      box.appendChild(when);
    }

    // U14: the compass / room / clean-% questions this rule owns
    const chipRow = (title, opts, isOn, set) => {
      const w = document.createElement('div');
      w.className = 'rwhen';
      w.appendChild(txt(title));
      const cc = document.createElement('div');
      cc.className = 'chips';
      opts.forEach((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip2' + (isOn(o) ? ' on sel' : '');
        b.innerHTML = o.label;
        if (o.title) b.title = o.title;
        b.onclick = () => { set(o); refresh(); };
        cc.appendChild(b);
      });
      w.appendChild(cc);
      box.appendChild(w);
      return w;
    };
    if (r.members.indexOf('compass') >= 0) {
      chipRow(L('This rule waits until the robot FACES which way? (heading, ±45°)', 'این قانون صبر می‌کند تا ربات رو به کدام سمت باشد؟ (heading، ±۴۵°)'),
        DIRS.map((d) => ({ label: d.ar + ' ' + d.d + '°', title: d.fa, v: d.d })),
        (o) => r.dir === o.v, (o) => { r.dir = o.v; });
    }
    if (r.members.indexOf('room') >= 0) {
      chipRow(L('The rule fires while the robot is IN which room?', 'قانون وقتی روشن است که ربات داخلِ کدام اتاق باشد؟'),
        ROOM_NAMES.map((n, i) => ({ label: i + ' · ' + esc(n), v: i })),
        (o) => r.roomPick === o.v, (o) => { r.roomPick = o.v; });
    }
    if (r.members.indexOf('clean') >= 0) {
      chipRow(L('Watch the clean-% of WHICH room?', 'درصد تمیزیِ کدام اتاق را نگاه کنیم؟'),
        [1, 2, 3, 4, 5].map((i) => ({ label: 'clean' + i + ' · ' + esc(ROOM_NAMES[i]), v: i })),
        (o) => r.cleanRoom === o.v, (o) => { r.cleanRoom = o.v; });
      const dl = document.createElement('div');
      dl.className = 'dials';
      dl.appendChild(dial(L('Room counts as DONE over', 'اتاق «تمام‌شده» حساب شود بالای'), r.cleanPct, '%',
        'writes clean' + r.cleanRoom + ' &gt; <b>' + r.cleanPct + '</b>',
        (dir) => { r.cleanPct = clamp(r.cleanPct + dir * 5, 5, 99); refresh(); },
        (v) => { r.cleanPct = clamp(Math.round(v), 5, 99); refresh(); }));
      box.appendChild(dl);
    }

    // THEN — the whole point of the page: which way do I go?
    const q = document.createElement('h2');
    q.className = 'aq';
    q.innerHTML = '<span class="step">2</span> ' + (PAGE_LANG === 'fa'
      ? 'وقتی ' + (r.members.length > 1 ? 'همه با هم روشن شدند' : 'روشن شد') + '، ربات کدام طرف برود؟'
      : 'When ' + (r.members.length > 1 ? 'ALL of them fire together' : 'it fires') + ', which way should the robot go?');
    box.appendChild(q);

    const acts = document.createElement('div');
    acts.className = 'acts';
    ACT_IDS.forEach((id) => {
      const A = ACTS[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'act' + (r.act === id ? ' on' : '');
      b.innerHTML = ICON[A.icon] + '<span>' + esc(A.label) + '</span>' +
        (id === best ? '<span class="star">' + L('smart', 'هوشمند') + '</span>' : '');
      b.title = A.why;
      b.onclick = () => { r.act = id; r.speed = A.def; r.on = true; refresh(); };
      acts.appendChild(b);
    });
    box.appendChild(acts);

    // an absolute turn: WHICH compass number, and how hard to spin
    const degDial = (label, get, set, spGet, spSet) => {
      const dl = document.createElement('div');
      dl.className = 'dials';
      dl.appendChild(dial(label, get(), '°', 'turns until heading reads <b>' + get() + '</b>',
        (dir) => { set((((get() + dir * 45) % 360) + 360) % 360); refresh(); },
        (v) => { set(((Math.round(v) % 360) + 360) % 360); refresh(); }));
      dl.appendChild(dial(L('How fast to spin', 'با چه سرعتی بچرخد'), spGet(), '', 'writes wheels <b>' + spGet() + '</b> / <b>-' + spGet() + '</b>',
        (dir) => { spSet(ladder(SPD, spGet(), dir)); refresh(); },
        (v) => { spSet(clamp(Math.round(v), 1, 25)); refresh(); }));
      box.appendChild(dl);
      const dc = document.createElement('div');
      dc.className = 'rwhen';
      dc.appendChild(txt(L('...or tap a direction:', '...یا یک جهت را بزن:')));
      const cc = document.createElement('div');
      cc.className = 'chips';
      DIRS.forEach((d) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip2' + (get() === d.d ? ' on sel' : '');
        b.textContent = d.ar + ' ' + d.d + '°';
        b.title = d.fa;
        b.onclick = () => { set(d.d); refresh(); };
        cc.appendChild(b);
      });
      dc.appendChild(cc);
      box.appendChild(dc);
    };
    if (r.act === 'turnto') {
      degDial(L('Turn until heading reads', 'بچرخ تا قطب‌نما بشود'), () => r.deg, (v) => { r.deg = v; },
        () => r.speed, (v) => { r.speed = v; });
      const sw = document.createElement('div');
      sw.className = 'swing';
      sw.innerHTML = '<div class="swingnums"><span><b>' + r.deg + '°</b> ' + L('on the compass', 'روی قطب‌نما') + '</span>' +
        '<span class="wheelnums">' + L('0 = right · 90 = up · 180 = left · 270 = down', '۰ راست · ۹۰ بالا · ۱۸۰ چپ · ۲۷۰ پایین') + '</span></div>' +
        '<p>' + L('Not a timed spin: the code keeps checking <code>heading</code> every step and stops ' +
        'turning the moment it reads about ' + r.deg + '° (±12°). Chain two of these with a drive ' +
        'in between and the robot walks out of a room corner by corner.',
        'چرخشِ زمانی نیست: کد هر لحظه <code>heading</code> را چک می‌کند و همین که حدود ' + r.deg +
        '° شد (±۱۲°) می‌ایستد. دو تا از همین را با یک حرکت مستقیم وسطش زنجیر کن تا ربات مرحله‌به‌مرحله از اتاق بیرون برود.') + '</p>';
      box.appendChild(sw);
    }

    // EVERY NUMBER OF THIS RULE, SIDE BY SIDE — how close, how fast, how long.
    if (r.act !== 'stop' && r.act !== 'turnto') {
      const dials = document.createElement('div');
      dials.className = 'dials';
      const hasDist = r.members.map(sensorOf).some((s) => s && s.kind === 'dist');
      if (hasDist) {
        dials.appendChild(dial(L('Closer than', 'نزدیک‌تر از'), r.cm, 'cm', 'writes ' +
          (r.members.length > 1 ? 'each eye' : r.members[0]) + ' &lt; <b>' + r.cm + '</b>',
          (dir) => { r.cm = ladder(CM, r.cm, dir); refresh(); },
          (v) => { r.cm = clamp(Math.round(v), 5, 200); refresh(); }));
      }
      const m0 = motion(r.act, r.speed, r.secs);
      dials.appendChild(dial(L('How fast to turn', 'با چه سرعتی'), r.speed, '', 'writes wheels <b>' + m0.wl + '</b> / <b>' + m0.wr + '</b>',
        (dir) => { r.speed = ladder(SPD, r.speed, dir); refresh(); },
        (v) => { r.speed = clamp(Math.round(v), 1, 25); refresh(); }));
      dials.appendChild(dial(L('For how long', 'چند ثانیه'), num1(r.secs), 's', 'writes seconds(<b>' + num1(r.secs) + '</b>) = ' + m0.steps + ' steps',
        (dir) => { r.secs = ladder(SECS, r.secs, dir); refresh(); },
        (v) => { r.secs = Math.round(clamp(v, 0.1, 6) * 10) / 10; refresh(); }));
      box.appendChild(dials);

      // AND THIS IS WHAT THOSE NUMBERS ADD UP TO
      const m = motion(r.act, r.speed, r.secs);
      const swing = document.createElement('div');
      swing.className = 'swing';
      swing.innerHTML =
        '<div class="swingnums">' +
          '<span><b>' + Math.round(m.deg) + '&deg;</b>' + (m.deg ? L(' of turn', ' چرخش') : L(' — it does not turn', ' — نمی‌چرخد')) + '</span>' +
          '<span><b>' + Math.round(m.cm) + ' cm</b>' + L(' travelled', ' جابه‌جایی') + '</span>' +
          '<span class="wheelnums">' + L('wheels', 'چرخ‌ها') + ' <b>' + m.wl + '</b> / <b>' + m.wr + '</b></span>' +
        '</div>' +
        '<p>' + L('Both numbers are <b>roughly right</b>, worked out from the wheels the way the match works them out. ' +
        'On the real floor a robot leaning on a wall or a chair turns a little less — so treat ' +
        Math.round(m.deg) + '&deg; as the aim, and watch the room for what actually happens.',
        'هر دو عدد <b>حدودی</b>اند — از روی چرخ‌ها همان‌طور حساب شده‌اند که خودِ مسابقه حساب می‌کند. ' +
        'روی زمینِ واقعی رباتی که به دیوار یا صندلی تکیه کرده کمی کمتر می‌چرخد — پس ' +
        Math.round(m.deg) + '° را هدف بگیر و اتاقک را نگاه کن ببین واقعاً چه می‌شود.') + '</p>';
      box.appendChild(swing);
    }

    // THEN — an optional SECOND move: back off... and then turn; drive in...
    // and then spin. How far each part goes is the child's numbers, not ours.
    const q2 = document.createElement('h2');
    q2.className = 'aq';
    q2.innerHTML = '<span class="step">+</span> ' + L('...and THEN? (a second move, if you want one)', '...و بعدش؟ (حرکت دوم، اگر خواستی)');
    box.appendChild(q2);
    const acts2 = document.createElement('div');
    acts2.className = 'acts acts2';
    const none = document.createElement('button');
    none.type = 'button';
    none.className = 'act quiet' + (r.act2 == null ? ' on' : '');
    none.innerHTML = ICON.none + '<span>' + L('Nothing', 'هیچی') + '</span>';
    none.onclick = () => { r.act2 = null; refresh(); };
    acts2.appendChild(none);
    ACT_IDS.forEach((id) => {
      if (id === 'stop') return;
      const A = ACTS[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'act' + (r.act2 === id ? ' on' : '');
      b.innerHTML = ICON[A.icon] + '<span>' + esc(A.label) + '</span>';
      b.title = A.why;
      b.onclick = () => { r.act2 = id; r.speed2 = A.def; refresh(); };
      acts2.appendChild(b);
    });
    box.appendChild(acts2);
    if (r.act2 === 'turnto') {
      degDial(L('Then: turn until heading reads', 'بعد: بچرخ تا قطب‌نما بشود'), () => r.deg2, (v) => { r.deg2 = v; },
        () => r.speed2, (v) => { r.speed2 = v; });
    } else if (r.act2) {
      const m2 = motion(r.act2, r.speed2, r.secs2);
      const dials2 = document.createElement('div');
      dials2.className = 'dials';
      dials2.appendChild(dial(L('Then: how fast', 'بعد: چه سرعتی'), r.speed2, '', 'writes wheels <b>' + m2.wl + '</b> / <b>' + m2.wr + '</b>',
        (dir) => { r.speed2 = ladder(SPD, r.speed2, dir); refresh(); },
        (v) => { r.speed2 = clamp(Math.round(v), 1, 25); refresh(); }));
      dials2.appendChild(dial(L('Then: how long', 'بعد: چند ثانیه'), num1(r.secs2), 's',
        (m2.deg >= 1 ? 'about <b>' + Math.round(m2.deg) + ' deg</b> of turn' : '<b>' + Math.round(m2.cm) + ' cm</b> travelled'),
        (dir) => { r.secs2 = ladder(SECS, r.secs2, dir); refresh(); },
        (v) => { r.secs2 = Math.round(clamp(v, 0.1, 6) * 10) / 10; refresh(); }));
      box.appendChild(dials2);
    }

    // U14: ...and a THIRD move — enough for "turn, drive, turn": the way out
    // of a room is three legs, and that is exactly what this slot is for.
    if (U14 && r.act2) {
      const q3 = document.createElement('h2');
      q3.className = 'aq';
      q3.innerHTML = '<span class="step">+</span> ' + L('...and THEN? (a third move — turn, drive, turn walks you out of a room)', '...و بعدش؟ (حرکت سوم — «بچرخ، برو، بچرخ» تو را از اتاق بیرون می‌برد)');
      box.appendChild(q3);
      const acts3 = document.createElement('div');
      acts3.className = 'acts acts2';
      const none3 = document.createElement('button');
      none3.type = 'button';
      none3.className = 'act quiet' + (r.act3 == null ? ' on' : '');
      none3.innerHTML = ICON.none + '<span>' + L('Nothing', 'هیچی') + '</span>';
      none3.onclick = () => { r.act3 = null; refresh(); };
      acts3.appendChild(none3);
      ACT_IDS.forEach((id) => {
        if (id === 'stop') return;
        const A = ACTS[id];
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'act' + (r.act3 === id ? ' on' : '');
        b.innerHTML = ICON[A.icon] + '<span>' + esc(A.label) + '</span>';
        b.title = A.why;
        b.onclick = () => { r.act3 = id; r.speed3 = A.def; refresh(); };
        acts3.appendChild(b);
      });
      box.appendChild(acts3);
      if (r.act3 === 'turnto') {
        degDial(L('Finally: turn until heading reads', 'آخر: بچرخ تا قطب‌نما بشود'), () => r.deg3, (v) => { r.deg3 = v; },
          () => r.speed3, (v) => { r.speed3 = v; });
      } else if (r.act3) {
        const m3 = motion(r.act3, r.speed3, r.secs3);
        const dials3 = document.createElement('div');
        dials3.className = 'dials';
        dials3.appendChild(dial(L('Finally: how fast', 'آخر: چه سرعتی'), r.speed3, '', 'writes wheels <b>' + m3.wl + '</b> / <b>' + m3.wr + '</b>',
          (dir) => { r.speed3 = ladder(SPD, r.speed3, dir); refresh(); },
          (v) => { r.speed3 = clamp(Math.round(v), 1, 25); refresh(); }));
        dials3.appendChild(dial(L('Finally: how long', 'آخر: چند ثانیه'), num1(r.secs3), 's',
          (m3.deg >= 1 ? 'about <b>' + Math.round(m3.deg) + ' deg</b> of turn' : '<b>' + Math.round(m3.cm) + ' cm</b> travelled'),
          (dir) => { r.secs3 = ladder(SECS, r.secs3, dir); refresh(); },
          (v) => { r.secs3 = Math.round(clamp(v, 0.1, 6) * 10) / 10; refresh(); }));
        box.appendChild(dials3);
      }
    }

    const why = document.createElement('div');
    why.className = 'rwhy';
    why.innerHTML = whyLine(r, best);
    box.appendChild(why);

    // the lines of Python THIS rule is responsible for
    const mine = document.createElement('pre');
    mine.className = 'mypy';
    mine.textContent = r.on ? ruleLines(r) : L('# this rule is switched off - it writes nothing', '# این قانون خاموش است - چیزی نمی‌نویسد');
    box.appendChild(mine);
  }

  // THE DRIVING ITSELF — no sensor, no direction, one number: how fast the
  // robot rolls when not one rule was true. It is the `else` in the file.
  function drawDrivePanel(box) {
    box.className = 'card askcard';
    const head = document.createElement('div');
    head.className = 'ahead';
    head.innerHTML =
      '<span class="adot" style="color:#22c55e">' + ICON.forward + '</span>' +
      '<span><span class="aname">' + L('Just driving', 'رانندگیِ عادی') + '<code>else</code></span>' +
      '<div class="awhere">' + L('not a rule — the wheels when no rule is true', 'قانون نیست — چرخ‌ها وقتی هیچ قانونی روشن نیست') + '</div></span>';
    box.appendChild(head);

    const p = document.createElement('div');
    p.className = 'rwhen';
    p.appendChild(txt(L('This is what the robot does while no rule has anything to say — it rolls straight ahead, cleaning every tile it crosses.', 'کاری که ربات وقتی هیچ قانونی حرفی ندارد می‌کند — مستقیم می‌راند و هر کاشی سر راهش را تمیز می‌کند.')));
    box.appendChild(p);

    const dials = document.createElement('div');
    dials.className = 'dials';
    dials.appendChild(dial(L('How fast to drive', 'با چه سرعتی براند'), DRIVE.speed, '', 'writes wheels <b>' + DRIVE.speed + '</b> / <b>' + DRIVE.speed + '</b>',
      (dir) => { DRIVE.speed = ladder(SPD, DRIVE.speed, dir); refresh(); },
      (v) => { DRIVE.speed = clamp(Math.round(v), 1, 25); refresh(); }));
    box.appendChild(dials);

    const sw = document.createElement('div');
    sw.className = 'swing';
    sw.innerHTML =
      '<div class="swingnums"><span><b>' + Math.round(DRIVE.speed / 25 * 100) + ' cm</b>' + L(' a second', ' در ثانیه') + '</span>' +
      '<span class="wheelnums">' + L('wheels', 'چرخ‌ها') + ' <b>' + DRIVE.speed + '</b> / <b>' + DRIVE.speed + '</b></span></div>' +
      '<p>' + L('25 is full speed. Slower means fewer tiles a minute, but the eyes get more warning before a wall — ' +
      'the numbers are <b>roughly right</b>, as always.',
      '۲۵ یعنی تمام سرعت. آهسته‌تر یعنی کاشیِ کمتر در دقیقه، ولی چشم‌ها زودتر از دیوار خبر می‌دهند — اعداد مثل همیشه <b>حدودی</b>اند.') + '</p>';
    box.appendChild(sw);

    const mine = document.createElement('pre');
    mine.className = 'mypy';
    mine.textContent = elseLines();
    box.appendChild(mine);
  }

  function whyLine(r, best) {
    if (!r.on) return L('This rule is switched off, so it writes no line of Python.', 'این قانون خاموش است و هیچ خطی از پایتون نمی‌نویسد.');
    const A = ACTS[r.act];
    let s = '<b>' + esc(A.label) + '</b> — ' + esc(A.why) + '.';
    if (r.act !== best) {
      s += L(' The smart answer for these sensors is usually <b>' + esc(ACTS[best].label) + '</b> — tap it and watch the room to see the difference.',
        ' جوابِ هوشمند برای این سنسورها معمولاً <b>' + esc(ACTS[best].label) + '</b> است — بزنش و اتاقک را نگاه کن تا فرق را ببینی.');
    } else if (r.members.length > 1) {
      s += L(' All ' + r.members.length + ' must fire in the SAME tenth of a second, so put this rule ABOVE the single-sensor ones or they will always win first.',
        ' هر ' + r.members.length + ' تا باید در یک دهم‌ثانیه با هم روشن شوند؛ این قانون را بالای قانون‌های تک‌سنسوری بگذار وگرنه همیشه آن‌ها اول می‌برند.');
    }
    return s;
  }

  function txt(t) { const s = document.createElement('span'); s.textContent = t; return s; }

  // one number of a rule: a name, a − / + you can also TYPE into, and a line
  // saying what this very number turns into in the Python underneath
  function dial(label, value, unit, note, onStep, onSet) {
    const box = document.createElement('div');
    box.className = 'dialbox';
    const l = document.createElement('span'); l.className = 'dlabel'; l.textContent = label;
    const n = document.createElement('span'); n.className = 'dnote'; n.innerHTML = note;
    box.appendChild(l);
    box.appendChild(stepper(value, unit, onStep, onSet));
    box.appendChild(n);
    return box;
  }

  function stepper(value, unit, onStep, onSet) {
    const box = document.createElement('span');
    box.className = 'num';
    const minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−';
    const plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+';
    minus.onclick = () => onStep(-1);
    plus.onclick = () => onStep(+1);
    box.appendChild(minus);
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'decimal';
    inp.value = String(value);
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } };
    inp.onchange = () => {
      const v = parseFloat(String(inp.value).replace(/[,٫]/g, '.'));
      if (isFinite(v)) onSet(v); else refresh();          // nonsense typed in: put it back
    };
    box.appendChild(inp);
    if (unit) { const u = document.createElement('i'); u.textContent = unit; box.appendChild(u); }
    box.appendChild(plus);
    return box;
  }

  function select(id) {
    if (id !== 'drive' && !ruleOf(id)) return;
    if (id === sel) return;
    sel = id;
    resetSim();                      // the little room re-aims at the new rule
  }

  /* ================================================================
     7. THE CLAUSES  —  the rules, in the child's order, as Python.
     ================================================================ */
  function clauses() {
    return RULES.filter((r) => r.on && r.members.length).map((r) => ({ rule: r }));
  }

  const cmt = (code, note) => {                 // code + a comment, lined up
    if (!note) return code;
    const n = code.length >= 30 ? 1 : 31 - code.length;
    return code + new Array(n + 1).join(' ') + '# ' + note;
  };

  // the bottom of the file: what to do when not one rule was true
  function elseLines(bare) {
    const v = DRIVE.speed, tab = bare ? '' : '    ';
    return [
      bare ? null : cmt('else:', 'no rule fired'),
      cmt(tab + 'wheelleft = ' + v, 'straight ahead - and every tile'),
      cmt(tab + 'wheelright = ' + v, 'I drive over turns my colour'),
    ].filter((l) => l != null).join('\n');
  }

  function condOf(r) {
    return r.members.map((id) => {
      const s = sensorOf(id);
      if (s.kind === 'dist') return s.py + ' < ' + r.cm;
      if (s.kind === 'bump') return s.py + ' == 1';
      if (s.kind === 'compass') {
        const d0 = ((r.dir % 360) + 360) % 360;    // facing that way, give or take 45
        return d0 === 0 ? '(heading < 45 or heading > 315)'
          : '(heading > ' + (d0 - 45) + ' and heading < ' + (d0 + 45) + ')';
      }
      if (s.kind === 'room') return 'room == ' + r.roomPick;
      if (s.kind === 'clean') return 'clean' + r.cleanRoom + ' > ' + r.cleanPct;
      return 'color == ' + r.colorPick;
    }).join(' and ');
  }
  const ROOM_NAMES = (PAGE_LANG === 'fa')
    ? ['هال', 'آشپزخانه', 'اتاق‌خواب ۱', 'اتاق‌خواب ۲', 'اتاق‌خواب ۳', 'سرویس']
    : ['the hall', 'the kitchen', 'bedroom 1', 'bedroom 2', 'bedroom 3', 'the bathroom'];
  function noteOf(r) {
    if (r.members.length > 1) return 'all of these at once';
    const s = sensorOf(r.members[0]);
    if (s.kind === 'dist') return 'something closer than ' + r.cm + ' cm ' + ascii(whereLabel(s.angle));
    if (s.kind === 'bump') return s.angle === 0 ? 'I ran into something' : 'something touched my back';
    if (s.kind === 'compass') return 'I am facing about ' + r.dir + ' deg';
    if (s.kind === 'room') return 'I am in ' + ROOM_NAMES[r.roomPick];
    if (s.kind === 'clean') return ROOM_NAMES[r.cleanRoom] + ' is over ' + r.cleanPct + '% mine - leave it';
    return colorOf(r.colorPick).note;
  }

  /* ---- U14 plans: the moves of one rule, as a LIST of legs ----
     A rule whose first move is a plain timed one and whose only follow-up is
     a plain timed second move compiles exactly as it always did (FS output is
     untouched). The moment a rule uses turn-to (an absolute compass turn) or
     a THIRD move, it becomes a PLAN: the fire clause only starts it, and one
     numbered handler per leg walks it leg by leg - nextmove = rule*10 + leg. */
  function legsOf(r) {
    const L = [{ act: r.act, speed: r.speed, secs: r.secs, deg: r.deg, f: '' }];
    if (r.act2) L.push({ act: r.act2, speed: r.speed2, secs: r.secs2, deg: r.deg2, f: '2' });
    if (U14 && r.act2 && r.act3) L.push({ act: r.act3, speed: r.speed3, secs: r.secs3, deg: r.deg3, f: '3' });
    return L;
  }
  const isPlan = (r) => legsOf(r).length > 2 || legsOf(r).some((l) => l.act === 'turnto');

  // the fire clause of a plan: it only STARTS the plan
  function planFireLines(r, kw) {
    const idx = RULES.indexOf(r) + 1;
    const n = legsOf(r).length;
    return [
      cmt((kw || 'if ') + condOf(r) + ' and movetime == 0 and nextmove == 0:', noteOf(r)),
      cmt('    nextmove = ' + (idx * 10 + 1), 'start my ' + n + '-step plan'),
    ].join('\n');
  }
  // one leg of a plan, as its own handler high up the chain
  function planLegLines(r, k, kw) {
    const idx = RULES.indexOf(r) + 1;
    const legs = legsOf(r);
    const leg = legs[k];
    const c = idx * 10 + k + 1;
    const nc = (k + 1 < legs.length) ? idx * 10 + k + 2 : 0;
    const stepName = 'rule ' + idx + ' step ' + (k + 1) + ' of ' + legs.length;
    if (leg.act === 'turnto') {
      const D = ((leg.deg % 360) + 360) % 360;
      const sp = clamp(Math.round(leg.speed), 1, 25);
      return [
        cmt((kw || 'if ') + 'nextmove == ' + c + ' and movetime == 0:', stepName + ': face ' + D + ' deg'),
        cmt('    err = ' + D + ' - heading', 'how far off am I?'),
        '    if err > 180:',
        '        err = err - 360',
        '    if err < -180:',
        '        err = err + 360',
        cmt('    if abs(err) > 12:', 'not there yet - keep turning'),
        '        wheelleft = ' + sp,
        '        wheelright = -' + sp,
        cmt('        if err > 0:', 'shorter the other way round'),
        '            wheelleft = -' + sp,
        '            wheelright = ' + sp,
        '    else:',
        cmt('        nextmove = ' + nc, nc ? 'facing ' + D + ' - next step' : 'facing ' + D + ' - plan done'),
      ].join('\n');
    }
    const A = ACTS[leg.act];
    const m = motion(leg.act, leg.speed, leg.secs);
    return [
      cmt((kw || 'if ') + 'nextmove == ' + c + ' and movetime == 0:', stepName),
      '    nextmove = ' + nc,
      cmt('    wheelleft = ' + m.wl, A.label.toLowerCase()),
      '    wheelright = ' + m.wr,
      cmt('    movetime = seconds(' + num1(leg.secs) + ')',
        m.deg >= 1 ? 'about ' + Math.round(m.deg) + ' deg of turn' : 'hold it for ' + num1(leg.secs) + ' s'),
    ].join('\n');
  }

  // one rule, as the Python really writes it. Rules only decide while no move
  // is running (movetime == 0); a rule with a SECOND move leaves its number in
  // `nextmove`, and the matching handler at the top of the chain picks it up
  // the moment the first move runs out.
  function clauseLines(cl, kw) {
    const r = cl.rule, A = ACTS[r.act];
    const m = motion(r.act, r.speed, r.secs);
    const idx = RULES.indexOf(r) + 1;
    return [
      cmt((kw || 'if ') + condOf(r) + ' and movetime == 0:', noteOf(r)),
      cmt('    wheelleft = ' + m.wl, A.label.toLowerCase()),
      '    wheelright = ' + m.wr,
      cmt('    movetime = seconds(' + num1(r.secs) + ')',
        m.deg >= 1 ? 'about ' + Math.round(m.deg) + ' deg of turn' : 'hold it for ' + num1(r.secs) + ' s'),
      r.act2 ? cmt('    nextmove = ' + idx, 'then do my second move') : null,
    ].filter((l) => l != null).join('\n');
  }

  // the second-move handler: it OUTRANKS every sensor, because a started
  // manoeuvre should finish before anything new is decided
  function thenLines(r, kw) {
    const A = ACTS[r.act2];
    const m = motion(r.act2, r.speed2, r.secs2);
    const idx = RULES.indexOf(r) + 1;
    return [
      cmt((kw || 'if ') + 'nextmove == ' + idx + ' and movetime == 0:', 'rule ' + idx + ', part two'),
      '    nextmove = 0',
      cmt('    wheelleft = ' + m.wl, 'then ' + A.label.toLowerCase()),
      '    wheelright = ' + m.wr,
      cmt('    movetime = seconds(' + num1(r.secs2) + ')',
        m.deg >= 1 ? 'about ' + Math.round(m.deg) + ' deg of turn' : 'hold it for ' + num1(r.secs2) + ' s'),
    ].join('\n');
  }

  // everything ONE rule writes — part two first, so the panel reads like the file
  function ruleLines(r) {
    const parts = [];
    if (isPlan(r)) {
      legsOf(r).forEach((l, k) => parts.push(planLegLines(r, k, k ? 'elif ' : 'if ')));
      parts.push(planFireLines(r, 'elif '));
      return parts.join('\n');
    }
    if (r.act2) parts.push(thenLines(r, 'if '));
    parts.push(clauseLines({ rule: r }, r.act2 ? 'elif ' : 'if '));
    return parts.join('\n');
  }

  /* ================================================================
     8. THE LITTLE ROOM  —  the same wheel maths as the match, so the
        answer on screen is the answer on the floor.
          throttle = wheel / 25,  v = (vL+vR)/2 * 1 m/s,
          omega = (vR - vL) / 0.5 m       (physics.js integrate())
     ================================================================ */
  const ROOM = { W: 4.9, H: 3.4, r: 0.24, maxSpeed: 1.0, base: 0.5, range: 2.0 };
  const WORLD = {
    segments: [
      { x1: 0, y1: 0, x2: ROOM.W, y2: 0 },
      { x1: ROOM.W, y1: 0, x2: ROOM.W, y2: ROOM.H },
      { x1: ROOM.W, y1: ROOM.H, x2: 0, y2: ROOM.H },
      { x1: 0, y1: ROOM.H, x2: 0, y2: 0 },
      // four walls and nothing else: the room exists to show what the answer
      // you just picked does, and a table in the middle only got in the way
    ],
  };
  // two rug spots: colour rules claim them in order, so a green rule and a
  // purple rule each get a rug of their own on the floor at the same time
  const RUGS = [
    { x1: 0.50, y1: 2.35, x2: 2.10, y2: 3.05 },
    { x1: 3.20, y1: 0.30, x2: 4.60, y2: 1.00 },
  ];
  // which colour sits on which rug right now (rule order, distinct colours)
  function rugColors() {
    const out = [];
    for (const r of RULES) {
      if (!r.on || r.members.indexOf('color') < 0) continue;
      if (out.indexOf(r.colorPick) < 0) out.push(r.colorPick);
      if (out.length >= RUGS.length) break;
    }
    return out;
  }
  function floorAt(nx, ny) {
    const cols = rugColors();
    for (let i = 0; i < cols.length; i++) if (inRect(nx, ny, RUGS[i])) return cols[i];
    return 'white';
  }

  const sim = { x: 0, y: 0, h: 0, l: 0, r: 0, hold: 0, holdL: 0, holdR: 0, fired: null, trail: [], t: 0, acc: 0, queue: [], turnto: null, doneOnce: {} };

  function resetSim() {
    const r = ruleOf(sel);
    // aim the SELECTED rule's first sensor at the wall at the top of the room —
    // and a colour rule aims at ITS OWN rug, wherever the rules put it
    let a = 0, rug = null;
    if (r && r.members.length) {
      const first = sensorOf(r.members[0]);
      if (first.kind === 'color') {
        const i = rugColors().indexOf(r.colorPick);
        rug = RUGS[i >= 0 ? i : 0];
      } else a = first.angle;
    }
    sim.x = ROOM.W * 0.5; sim.y = 0.62;
    sim.h = Math.PI / 2 - a * D2R;
    if (rug) {
      const cx = (rug.x1 + rug.x2) / 2, cy = (rug.y1 + rug.y2) / 2;
      sim.x = cx; sim.y = Math.max(0.35, cy - 1.1);
      sim.h = Math.atan2(cy - sim.y, cx - sim.x);
    }
    sim.l = sim.r = 0; sim.hold = 0; sim.pending = null;
    sim.queue = []; sim.turnto = null; sim.doneOnce = {};
    sim.fired = null; sim.trail.length = 0; sim.t = 0; sim.acc = 0;
    sim.read = null; sim.touch = null; sim.floorCol = null;   // the readout empties too
  }

  function angles() {
    const out = {};
    SENSORS.forEach((s) => { if (s.kind === 'dist') out[s.id] = s.angle * D2R; });
    return out;
  }

  const inRect = (x, y, R) => x >= R.x1 && x <= R.x2 && y >= R.y1 && y <= R.y2;

  // nearest point of the room on the shell — that is what the ring feels, and
  // which half of the ring it lands on
  function contact() {
    let best = 1e9, bx = 0, by = 0;
    for (const s of WORLD.segments) {
      const ex = s.x2 - s.x1, ey = s.y2 - s.y1;
      const L2 = ex * ex + ey * ey;
      let t = L2 ? ((sim.x - s.x1) * ex + (sim.y - s.y1) * ey) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      const px = s.x1 + ex * t, py = s.y1 + ey * t;
      const d = Math.hypot(sim.x - px, sim.y - py);
      if (d < best) { best = d; bx = px; by = py; }
    }
    if (best > ROOM.r + 0.02) return null;
    let a = Math.atan2(by - sim.y, bx - sim.x) - sim.h;
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return Math.abs(a) <= Math.PI / 2 ? 'bumpfront' : 'bumpback';
  }

  // one controller step — the SAME chain, in the same order, as the Python
  function think() {
    const pose = { x: sim.x, y: sim.y, heading: sim.h, r: ROOM.r };
    const d = RobotSensors.distances(pose, WORLD, { maxRange: ROOM.range, angles: angles() });
    const touch = contact();
    const nx = sim.x + Math.cos(sim.h) * (ROOM.r + 0.06);
    const ny = sim.y + Math.sin(sim.h) * (ROOM.r + 0.06);
    const floor = floorAt(nx, ny);

    sim.read = d;
    sim.touch = touch; sim.floorCol = floor;   // kept for the live readout under the room
    if (sim.hold > 0) { sim.hold--; sim.l = sim.holdL; sim.r = sim.holdR; return; }
    // an ABSOLUTE turn holds the wheels itself, until the compass agrees
    if (sim.turnto && applyTurnSim()) return;
    // a finished move hands over to the rule's next leg
    if (sim.queue.length) { startLeg(sim.queue.shift()); return; }

    let hit = null;
    for (const cl of clauses()) {
      const r = cl.rule;
      const sat = r.members.every((id) => {
        const s = sensorOf(id);
        if (s.kind === 'dist') return d[id] * 100 < r.cm;
        if (s.kind === 'bump') return touch === id;
        if (s.kind === 'compass') {
          const cur = (((sim.h * 180 / Math.PI) % 360) + 360) % 360;
          let e2 = ((r.dir % 360) + 360) % 360 - cur;
          if (e2 > 180) e2 -= 360;
          if (e2 < -180) e2 += 360;
          return Math.abs(e2) < 45;
        }
        // the little room has no rooms: pretend "yes", once per run
        if (s.kind === 'room' || s.kind === 'clean') return !sim.doneOnce[r.id];
        return floor === r.colorPick && floor !== 'white';
      });
      if (sat) { hit = cl; break; }
    }
    sim.fired = hit ? hit.rule.id : null;
    if (hit) {
      // a room / clean-% rule fires ONCE per run in here: the little room has
      // no rooms, so the page pretends "yes" and plays the whole exit plan
      if (hit.rule.members.some((id) => { const s0 = sensorOf(id); return s0 && (s0.kind === 'room' || s0.kind === 'clean'); })) sim.doneOnce[hit.rule.id] = true;
      sim.queue = legsOf(hit.rule).slice();
      startLeg(sim.queue.shift());
    } else {
      const v = DRIVE.speed / 25;              // no rule fired -> just drive
      sim.l = sim.r = v;
    }
  }

  // start ONE leg of a plan: a timed move holds the wheels for its seconds,
  // an absolute turn keeps steering until the compass reads the number
  function startLeg(leg) {
    if (leg.act === 'turnto') {
      sim.turnto = { deg: ((leg.deg % 360) + 360) % 360, speed: leg.speed };
      applyTurnSim();
      return;
    }
    const m = motion(leg.act, leg.speed, leg.secs);
    sim.l = m.wl / 25; sim.r = m.wr / 25;
    sim.holdL = sim.l; sim.holdR = sim.r;
    sim.hold = m.steps - 1;
  }
  // true while still turning (wheels set); false the moment it is aimed
  function applyTurnSim() {
    const cur = (((sim.h * 180 / Math.PI) % 360) + 360) % 360;
    let err = sim.turnto.deg - cur;
    if (err > 180) err -= 360;
    if (err < -180) err += 360;
    if (Math.abs(err) > 12) {
      const v = clamp(sim.turnto.speed, 1, 25) / 25;
      sim.l = err > 0 ? -v : v; sim.r = err > 0 ? v : -v;
      return true;
    }
    sim.turnto = null;
    return false;
  }

  function stepSim(dt) {
    sim.acc += dt;
    while (sim.acc >= 0.1) { think(); sim.acc -= 0.1; }        // the brain runs 10x a second
    const vL = sim.l * ROOM.maxSpeed, vR = sim.r * ROOM.maxSpeed;
    sim.h += ((vR - vL) / ROOM.base) * dt;
    sim.x += ((vL + vR) / 2) * Math.cos(sim.h) * dt;
    sim.y += ((vL + vR) / 2) * Math.sin(sim.h) * dt;
    // the shell cannot go through a wall
    sim.x = Math.max(ROOM.r, Math.min(ROOM.W - ROOM.r, sim.x));
    sim.y = Math.max(ROOM.r, Math.min(ROOM.H - ROOM.r, sim.y));
    sim.trail.push([sim.x, sim.y]);
    if (sim.trail.length > 230) sim.trail.shift();
    sim.t += dt;
    // never cut off half way: the robot keeps driving for as long as the page
    // is open, and only starts again when a different rule is picked
  }

  const cv = $('anim'), cx = cv.getContext('2d');
  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 620, h = Math.round(w * (430 / 620));
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv._w = w; cv._h = h;
  }
  window.addEventListener('resize', fit);

  function draw() {
    const w = cv._w, h = cv._h, pad = 14;
    const S = Math.min((w - pad * 2) / ROOM.W, (h - pad * 2) / ROOM.H);
    const ox = (w - ROOM.W * S) / 2, oy = (h - ROOM.H * S) / 2;
    const X = (mx) => ox + mx * S;
    const Y = (my) => oy + (ROOM.H - my) * S;         // world y grows UP, canvas y grows down

    cx.clearRect(0, 0, w, h);
    cx.fillStyle = '#0f141d'; cx.fillRect(X(0), Y(ROOM.H), ROOM.W * S, ROOM.H * S);

    cx.strokeStyle = 'rgba(255,255,255,.045)'; cx.lineWidth = 1;
    for (let gx = 0; gx <= ROOM.W + .001; gx += 0.55) { cx.beginPath(); cx.moveTo(X(gx), Y(0)); cx.lineTo(X(gx), Y(ROOM.H)); cx.stroke(); }
    for (let gy = 0; gy <= ROOM.H + .001; gy += 0.55) { cx.beginPath(); cx.moveTo(X(0), Y(gy)); cx.lineTo(X(ROOM.W), Y(gy)); cx.stroke(); }

    // every rug a colour rule has claimed, each in its own colour
    const selRule = ruleOf(sel);
    rugColors().forEach((cName, i) => {
      const R2 = RUGS[i], hex = colorOf(cName).hex;
      cx.globalAlpha = .34; cx.fillStyle = hex;
      cx.fillRect(X(R2.x1), Y(R2.y2), (R2.x2 - R2.x1) * S, (R2.y2 - R2.y1) * S);
      cx.globalAlpha = .8; cx.strokeStyle = hex; cx.lineWidth = 2;
      cx.strokeRect(X(R2.x1), Y(R2.y2), (R2.x2 - R2.x1) * S, (R2.y2 - R2.y1) * S);
      cx.globalAlpha = 1;
    });

    cx.strokeStyle = '#3d4a63'; cx.lineWidth = 4; cx.lineCap = 'round';
    WORLD.segments.forEach((s) => { cx.beginPath(); cx.moveTo(X(s.x1), Y(s.y1)); cx.lineTo(X(s.x2), Y(s.y2)); cx.stroke(); });

    if (sim.trail.length > 1) {
      cx.strokeStyle = 'rgba(79,195,247,.32)'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(X(sim.trail[0][0]), Y(sim.trail[0][1]));
      for (let i = 1; i < sim.trail.length; i++) cx.lineTo(X(sim.trail[i][0]), Y(sim.trail[i][1]));
      cx.stroke();
    }

    // the eye beams: bright if in the selected rule, red while their rule fires
    const firedRule = sim.fired ? ruleOf(sim.fired) : null;
    const d = sim.read || {};
    SENSORS.forEach((sn) => {
      if (sn.kind !== 'dist') return;
      const inFired = firedRule && firedRule.members.indexOf(sn.id) >= 0;
      const inSel = selRule && selRule.members.indexOf(sn.id) >= 0;
      if (!inSel && !usedAnywhere(sn.id)) return;         // unused eyes stay out of the picture
      const a = sim.h + sn.angle * D2R;
      const len = Math.min(d[sn.id] != null ? d[sn.id] : ROOM.range, ROOM.range);
      const sx = sim.x + Math.cos(a) * ROOM.r, sy = sim.y + Math.sin(a) * ROOM.r;
      cx.strokeStyle = inFired ? 'rgba(244,63,94,.95)'
        : (inSel ? 'rgba(79,195,247,.65)' : 'rgba(120,150,190,.22)');
      cx.lineWidth = inFired ? 3.5 : (inSel ? 2.5 : 1.4);
      cx.beginPath(); cx.moveTo(X(sx), Y(sy)); cx.lineTo(X(sx + Math.cos(a) * len), Y(sy + Math.sin(a) * len)); cx.stroke();
    });

    // the robot: the SAME machine as the big picture — shaded shell, two
    // wheels, a lit nose — so the child recognises it, not an arrow
    const bx = X(sim.x), by = Y(sim.y), R = ROOM.r * S;
    const half = (from, to, col, wide) => {
      cx.beginPath();
      cx.arc(bx, by, R, -(sim.h + to), -(sim.h + from));
      cx.strokeStyle = col; cx.lineWidth = wide ? 6 : 3; cx.stroke();
    };
    // shadow, then the shaded shell
    cx.beginPath(); cx.arc(bx, by + R * 0.10, R * 1.04, 0, Math.PI * 2);
    cx.fillStyle = 'rgba(0,0,0,.32)'; cx.fill();
    const grad = cx.createRadialGradient(bx - R * .35, by - R * .35, R * .15, bx, by, R);
    grad.addColorStop(0, '#3d5170'); grad.addColorStop(.6, '#28364f'); grad.addColorStop(1, '#1a2438');
    cx.beginPath(); cx.arc(bx, by, R, 0, Math.PI * 2); cx.fillStyle = grad; cx.fill();
    // the two drive wheels, riding with the heading (canvas y runs down)
    cx.save();
    cx.translate(bx, by); cx.rotate(-sim.h);
    cx.fillStyle = '#0d1420'; cx.strokeStyle = '#3f5170'; cx.lineWidth = 1.5;
    [-1, 1].forEach((side) => {
      const wy = side * R * 0.74;
      cx.beginPath();
      if (cx.roundRect) cx.roundRect(-R * 0.42, wy - R * 0.15, R * 0.84, R * 0.30, R * 0.12);
      else cx.rect(-R * 0.42, wy - R * 0.15, R * 0.84, R * 0.30);
      cx.fill(); cx.stroke();
    });
    // the dust-bin lid in the middle
    cx.beginPath(); cx.arc(0, 0, R * 0.30, 0, Math.PI * 2);
    cx.fillStyle = '#141d2e'; cx.fill(); cx.strokeStyle = '#3f5170'; cx.stroke();
    // the lit nose
    cx.beginPath(); cx.arc(R * 0.66, 0, R * 0.18, 0, Math.PI * 2);
    cx.fillStyle = '#9fd0ff'; cx.fill();
    cx.beginPath(); cx.arc(R * 0.66, 0, R * 0.08, 0, Math.PI * 2);
    cx.fillStyle = '#eaf7ff'; cx.fill();
    cx.restore();
    // the bumper ring, on top of everything
    const bfHot = firedRule && firedRule.members.indexOf('bumpfront') >= 0;
    const bbHot = firedRule && firedRule.members.indexOf('bumpback') >= 0;
    half(-Math.PI / 2, Math.PI / 2, bfHot ? '#ffd23b' : (usedAnywhere('bumpfront') ? '#4d8bff' : '#3a465c'), bfHot);
    half(Math.PI / 2, Math.PI * 1.5, bbHot ? '#fb923c' : (usedAnywhere('bumpback') ? '#4d8bff' : '#3a465c'), bbHot);

    const label = !simOn ? 'preview'
      : firedRule
        ? 'rule ' + (RULES.indexOf(firedRule) + 1) + ' · ' + ACTS[firedRule.act].label
        : 'driving';
    $('animTag').textContent = label;
    $('animTag').style.background = !simOn ? '#8e9ab0' : (firedRule ? '#f43f5e' : '#4fc3f7');
    $('animTag').style.color = firedRule && simOn ? '#fff' : '#0a0d13';

    updateSense(firedRule);

    // ...and the same rule lights up in the LIST, so priority is something
    // the child watches happen, not something he is told about
    if (draw._fired !== sim.fired) {
      draw._fired = sim.fired;
      Array.prototype.forEach.call(document.querySelectorAll('.srow[data-rule]'), (el) => {
        el.classList.toggle('firing', el.getAttribute('data-rule') === sim.fired);
      });
    }
  }

  /* ---- the live readout under the room ----
     While ▶ Run is on, every sensor that sits in a rule shows the number it is
     reading RIGHT NOW — the same values think() just decided with: distances
     in cm (200 = nothing in range, like the match), which half of the ring is
     pressed, and the colour under the nose. A chip turns red together with its
     beam the moment its rule takes over. Paused = hidden: the preview is a
     pose, not a reading. */
  function updateSense(firedRule) {
    const box = $('senseOut');
    if (!simOn || !sim.read) {
      if (box._html !== null) { box._html = null; box.innerHTML = ''; box.style.display = 'none'; }
      return;
    }
    const parts = [];
    SENSORS.forEach((sn) => {
      if (!usedAnywhere(sn.id)) return;          // only the sensors a rule reads
      const hot = firedRule && firedRule.members.indexOf(sn.id) >= 0;
      let val;
      if (sn.kind === 'dist') {
        const d = sim.read[sn.id];
        val = (d != null ? Math.round(Math.min(d, ROOM.range) * 100) : '—') + ' cm';
      } else if (sn.kind === 'bump') {
        val = sim.touch === sn.id ? '1 — touching!' : '0';
      } else if (sn.kind === 'compass') {
        val = Math.round((((sim.h * 180 / Math.PI) % 360) + 360) % 360) + '°';
      } else if (sn.kind === 'room' || sn.kind === 'clean') {
        val = 'match only';
      } else {
        const c = colorOf(sim.floorCol || 'white');
        val = '<i style="background:' + c.hex + '"></i>' + esc(c.label);
      }
      parts.push('<span class="schip' + (hot ? ' hot' : '') + '"><code>' + esc(sn.py) + '</code><b>' + val + '</b></span>');
    });
    const html = parts.length ? parts.join('')
      : '<span class="snone">no sensor is in a rule yet — the robot is just driving</span>';
    if (box._html !== html) { box._html = html; box.innerHTML = html; box.style.display = ''; }
  }

  // The room opens as a STILL preview: the robot posed, nothing blinking.
  // Pressing Run is what starts the clock — a child reads the picture first
  // and watches it move second.
  let simOn = false;
  let last = 0;
  function loop(ts) {
    if (!last) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    if (simOn) stepSim(dt);
    draw();
    requestAnimationFrame(loop);
  }

  /* ================================================================
     9. THE PRODUCT  —  a real Python file
     ================================================================ */
  function toPython() {
    const L = [];
    const P = (s) => L.push(s == null ? '' : s);
    const BAR = '# ============================================================';
    const cls = clauses();

    P('# type: ignore');
    P('# cspell:ignore frontleft frontright bumperfront bumperback wheelleft wheelright movetime');
    P(BAR);
    P('#  MY ROBOT BRAIN  -  written in the Helper');
    P('#  built ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC · division ' + LEAGUE);
    P('#');
    P('#  The game runs this file 10 times every second, from the');
    P('#  top down. The FIRST rule that is true wins, and the robot');
    P('#  does nothing else until that move is over.');
    P('#');
    P('#  movetime = seconds(1)  keeps the wheels I just set for 1 s.');
    P('#');
    P('#  HOW FAR A MOVE TURNS ME - the degrees below are ROUGH:');
    P('#  they come out of the wheel numbers the way the match does');
    P('#    turn  = |wheelright - wheelleft| x 4.6 x seconds');
    P('#  so 18 / -18 for one second is about 165 deg. Leaning on a');
    P('#  wall or a chair turns you a little less than that.');
    P('#');
    P('#  MY RULES (' + cls.length + ', asked top to bottom):');
    cls.forEach((c, i) => {
      const r = c.rule;
      P('#    ' + (i + 1) + ') ' + pad(ascii(ruleName(r)), 30) + ascii(summaryOf(r)));
    });
    P('#    else) ' + pad('just drive', 27) + 'speed ' + DRIVE.speed);
    P(BAR);
    P('');
    P('# === EDITOR SETUP =========================================');
    P('# The game SKIPS this block. It is here only so a code editor');
    P('# stops drawing red lines under the sensor names.');
    P('front = 200; frontleft = 200; frontright = 200');
    P('bumperfront = 0; bumperback = 0; bumper = 0');
    P('color = 0; movetime = 0; nextmove = 0');
    P('white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5; orange = 6; cyan = 7');
    if (U14) P('heading = 0; room = 0; clean1 = 0; clean2 = 0; clean3 = 0; clean4 = 0; clean5 = 0; err = 0');
    P('wheelleft = 0; wheelright = 0');
    P('# === END EDITOR SETUP =====================================');
    P('');
    P('');

    // this is where the page starts: no rules yet, so the whole brain is the
    // driving. Building a rule is what puts a question above these lines.
    if (!cls.length) {
      P('# No rule is built yet, so there is nothing to react to:');
      P('# the robot just drives straight ahead all match. Make a');
      P('# rule in the helper and its question appears here.');
      P(elseLines(true));
      P('');
      return L.join('\n');
    }

    P('# ---------- MY RULES, IN MY ORDER ----------');
    P('# A rule only fires while no move is running (movetime == 0).');
    P('# Second moves come first: a started manoeuvre finishes before');
    P('# anything new is decided.');
    let kwUsed = false;
    const KW = () => { const k = kwUsed ? 'elif ' : 'if '; kwUsed = true; return k; };
    cls.forEach((c) => {
      if (isPlan(c.rule)) legsOf(c.rule).forEach((l, k) => { P(planLegLines(c.rule, k, KW())); P(''); });
      else if (c.rule.act2) { P(thenLines(c.rule, KW())); P(''); }
    });
    cls.forEach((c) => { P(isPlan(c.rule) ? planFireLines(c.rule, KW()) : clauseLines(c, KW())); P(''); });
    P(elseLines());
    P('');
    return L.join('\n');
  }

  /* ================================================================
     9.5  THE BRIDGE  —  the same file, with its numbers alive.

     The transition out of the helper is the editor, and the editor is
     just this file. So the code panel is not a picture: every number a
     rule owns is EDITABLE right in the Python — type a new threshold or
     speed and the rule, the chips and the little room all follow. The
     child learns "the code IS the rules" here, before ever meeting U14's
     empty editor. Download / Copy / Play still use toPython() untouched.
     ================================================================ */
  const numSpan = (val, rid, field) =>
    '<span class="pynum" tabindex="0" data-rid="' + (rid == null ? '' : rid) + '" data-field="' + field +
    '" title="click and type a new number — the rule follows">' + val + '</span>';

  // wrap the numbers ONE rule's lines own; comments hold no such patterns
  function wrapClause(text, r, two) {
    const spd = two ? 'speed2' : 'speed', sec = two ? 'secs2' : 'secs';
    let h = esc(text);
    if (!two) h = h.replace(/&lt; (\d+)/g, (m0, n) => '&lt; ' + numSpan(n, r.id, 'cm'));
    if (!two) h = h.replace(/(clean\d &gt; )(\d+)/g, (m0, a, n) => a + numSpan(n, r.id, 'cleanPct'));
    h = h.replace(/(wheel(?:left|right) = )(-?\d+)/g, (m0, a, n) => a + numSpan(n, r.id, spd));
    h = h.replace(/(seconds\()([\d.]+)/g, (m0, a, n) => a + numSpan(n, r.id, sec));
    return h;
  }
  // a plan's fire clause: the numbers of its CONDITION are the live ones
  function wrapFire(text, r) {
    let h = esc(text);
    h = h.replace(/&lt; (\d+)/g, (m0, n) => '&lt; ' + numSpan(n, r.id, 'cm'));
    h = h.replace(/(clean\d &gt; )(\d+)/g, (m0, a, n) => a + numSpan(n, r.id, 'cleanPct'));
    return h;
  }
  // one leg of a plan: its own target / speed / seconds go live
  function wrapPlanLeg(text, r, leg) {
    let h = esc(text);
    h = h.replace(/(err = )(\d+)/g, (m0, a, n) => a + numSpan(n, r.id, 'deg' + leg.f));
    h = h.replace(/(wheel(?:left|right) = -?)(\d+)/g, (m0, a, n) => a + numSpan(n, r.id, 'speed' + leg.f));
    h = h.replace(/(seconds\()([\d.]+)/g, (m0, a, n) => a + numSpan(n, r.id, 'secs' + leg.f));
    return h;
  }
  const wrapElse = (text) =>
    esc(text).replace(/(wheel(?:left|right) = )(-?\d+)/g, (m0, a, n) => a + numSpan(n, null, 'drive'));

  function renderCode() {
    const full = toPython();
    const cls = clauses();
    // the header — everything down to the blank lines after EDITOR SETUP —
    // carries no rule numbers, so it is taken from the real file verbatim
    const cutAt = full.indexOf('# === END EDITOR SETUP');
    const headEnd = full.indexOf('\n', cutAt) + 1;
    const out = [esc(full.slice(0, headEnd)) + '\n'];
    if (!cls.length) {
      out.push(esc('# No rule is built yet, so there is nothing to react to:\n' +
        '# the robot just drives straight ahead all match. Make a\n' +
        '# rule in the helper and its question appears here.\n'));
      out.push(wrapElse(elseLines(true)) + '\n');
    } else {
      out.push(esc('# ---------- MY RULES, IN MY ORDER ----------\n' +
        '# A rule only fires while no move is running (movetime == 0).\n' +
        '# Second moves come first: a started manoeuvre finishes before\n' +
        '# anything new is decided.\n'));
      let kwUsed = false;
      const KW = () => { const k = kwUsed ? 'elif ' : 'if '; kwUsed = true; return k; };
      cls.forEach((c) => {
        if (isPlan(c.rule)) legsOf(c.rule).forEach((l, k) => out.push(wrapPlanLeg(planLegLines(c.rule, k, KW()), c.rule, l) + '\n'));
        else if (c.rule.act2) out.push(wrapClause(thenLines(c.rule, KW()), c.rule, true) + '\n');
      });
      cls.forEach((c) => { out.push((isPlan(c.rule) ? wrapFire(planFireLines(c.rule, KW()), c.rule) : wrapClause(clauseLines(c, KW()), c.rule, false)) + '\n'); });
      out.push(wrapElse(elseLines()) + '\n');
    }
    $('code').innerHTML = out.join('\n');
  }

  // click a number, type, Enter (or click away) — Escape backs out
  function applyNum(rid, field, v) {
    if (isNaN(v)) { refresh(); return; }
    if (field === 'drive') { DRIVE.speed = clamp(Math.round(Math.abs(v)), 1, 25); }
    else {
      const r = RULES.filter((x) => String(x.id) === String(rid))[0];
      if (!r) { refresh(); return; }
      if (field === 'cm') r.cm = clamp(Math.round(v), 5, 200);
      else if (field === 'speed') r.speed = clamp(Math.round(Math.abs(v)), 1, 25);
      else if (field === 'secs') r.secs = clamp(v, 0.1, 6);
      else if (field === 'speed2') r.speed2 = clamp(Math.round(Math.abs(v)), 1, 25);
      else if (field === 'secs2') r.secs2 = clamp(v, 0.1, 6);
      else if (field === 'speed3') r.speed3 = clamp(Math.round(Math.abs(v)), 1, 25);
      else if (field === 'secs3') r.secs3 = clamp(v, 0.1, 6);
      else if (field === 'cleanPct') r.cleanPct = clamp(Math.round(v), 5, 99);
      else if (field === 'deg' || field === 'deg2' || field === 'deg3') r[field] = ((Math.round(v) % 360) + 360) % 360;
    }
    resetSim(); refresh();
    toast('The rule follows your number — watch the little room');
  }
  function startNumEdit(t) {
    if (t.querySelector('input')) return;
    const cur = t.textContent;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.value = cur; inp.className = 'pyedit';
    inp.size = Math.max(2, cur.length + 1);
    t.textContent = ''; t.appendChild(inp);
    inp.focus(); inp.select();
    const commit = () => applyNum(t.getAttribute('data-rid'), t.getAttribute('data-field'), parseFloat(inp.value));
    inp.onblur = commit;
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); inp.onblur = null; commit(); }
      if (e.key === 'Escape') { inp.onblur = null; refresh(); }
    };
  }
  $('code').addEventListener('click', (ev) => {
    const t = ev.target.closest ? ev.target.closest('.pynum') : null;
    if (t) startNumEdit(t);
  });
  $('code').addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    const t = ev.target.closest ? ev.target.closest('.pynum') : null;
    if (t) { ev.preventDefault(); startNumEdit(t); }
  });

  /* ================================================================
     10. WIRING
     ================================================================ */
  function refresh() {
    drawDiagram();
    drawList();
    drawAsk();
    renderCode();
    const r = ruleOf(sel);
    $('animWhy').innerHTML = r
      ? 'This is your whole program running, not just one rule. <b>' + esc(ruleName(r)) + '</b> is drawn bright; ' +
        'everything in a rule lights up red the moment that rule takes over. Change the answer and watch it again.'
      : L('Build a rule and this little room will show you what your answer does.', 'یک قانون بساز تا این اتاقک نشانت بدهد جوابت چه می‌کند.');
    const nOn = RULES.filter((x) => x.on && x.members.length).length;
    $('barHint').textContent = (typeof PAGE_LANG !== 'undefined' && PAGE_LANG === 'fa')
      ? RULES.length + ' قانون ساخته شد · ' + nOn + ' تا در فایل است.'
      : RULES.length + ' rule' + (RULES.length === 1 ? '' : 's') + ' built · ' + nOn + ' in the file.';
    save();
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.className = 'toast on';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.className = 'toast'; }, 2200);
  }

  $('simBtn').onclick = () => {
    simOn = !simOn;
    if (!simOn) resetSim();                       // pause = back to the posed preview
    $('simBtn').innerHTML = simOn ? '&#10074;&#10074; Pause' : '&#9654; Run';
    $('simBtn').classList.toggle('on', simOn);
  };

  $('backLink').href = GAME_URL + '?league=' + encodeURIComponent(LEAGUE);

  $('addRule').onclick = () => { createRuleWith(null); };

  $('resetBtn').onclick = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* private mode */ }
    RULES = []; DRIVE.speed = 25;
    sel = null;
    resetSim(); refresh();
    toast('Every rule thrown away — build your own');
  };

  $('copyBtn').onclick = () => {
    const py = toPython();
    if (navigator.clipboard) navigator.clipboard.writeText(py).then(() => toast('Copied'), () => toast('Could not copy'));
    else toast('Could not copy');
  };

  $('dlBtn').onclick = () => {
    const blob = new Blob([toPython()], { type: 'text/x-python' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'my-robot.py';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  // hand the file to the game: it is picked up by ?helpercode=1 and dropped
  // straight into the red team's editor. TEAM 2 has a key of its own, so two
  // teams building on one machine stop overwriting each other.
  $('playBtn').onclick = () => {
    try { localStorage.setItem(HANDOFF_KEY, toPython()); }
    catch (e) { toast('This browser will not let me save the file'); return; }
    location.href = GAME_URL + '?league=' + encodeURIComponent(LEAGUE) + '&helpercode=1';
  };
  if ($('playBtn2')) $('playBtn2').onclick = () => {
    try { localStorage.setItem(HANDOFF_KEY + '_blue', toPython()); }
    catch (e) { toast('This browser will not let me save the file'); return; }
    location.href = GAME_URL + '?league=' + encodeURIComponent(LEAGUE) + '&helpercode=1';
  };

  /* ---- ONE language at a time: the page follows the game (shl_lang).
     data-fa carries the Persian text for the fixed chrome; .i18n-fa /
     .i18n-en blocks show only in their own language. ---- */
  /* ---- U14's room-number lesson: one click builds the leave-the-room
     recipe so the coach can SHOW it, then edit the numbers live ---- */
  if (U14 && $('roomLesson')) {
    $('roomLesson').style.display = '';
    if ($('roomLessonEn')) $('roomLessonEn').style.display = '';
    if ($('roomRecipeBtnEn')) $('roomRecipeBtnEn').onclick = () => $('roomRecipeBtn').click();
    $('roomRecipeBtn').onclick = () => {
      const r = newRule(['room', 'clean']);
      r.roomPick = 2; r.cleanRoom = 2; r.cleanPct = 80;   // in room 2, room 2 is 80% mine
      // a MULTI-LEG exit: some rooms take several stages to leave —
      // face the door, drive through, then face the NEXT corridor.
      r.act = 'turnto'; r.deg = 270;                      // leg 1: face the door
      r.act2 = 'forward'; r.secs2 = 2; r.speed2 = 25;     // leg 2: drive OUT through it
      r.act3 = 'turnto'; r.deg3 = 180;                    // leg 3: face where the route continues
      RULES.push(r);
      sel = r.id;
      resetSim(); refresh();
      toast('قانون خروج ساخته شد — درجه‌ی در (۲۷۰) را با نقشه‌ی خودت تنظیم کن');
    };
  }

  /* ---- dark / light ---- */
  const THEME_KEY = 'shl_helper_theme';
  function applyTheme(t) {
    document.body.classList.toggle('light', t === 'light');
    const b = $('themeBtn');
    if (b) b.innerHTML = t === 'light' ? '&#127769; Dark' : '&#9728;&#65039; Light';
  }
  let theme = null;
  try { theme = localStorage.getItem(THEME_KEY); } catch (e) { /* private mode */ }
  if (theme !== 'light' && theme !== 'dark') {
    theme = (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }
  applyTheme(theme);
  if ($('themeBtn')) $('themeBtn').onclick = () => {
    theme = theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode */ }
    applyTheme(theme);
  };

  /* ---- go ---- */
  $('subTitle').textContent =
    /(^|-)fs$/.test(LEAGUE) ? L('First Step · Vacuum league', 'فرست‌استپ · لیگ جاروبرقی') :
    /(^|-)u14$/.test(LEAGUE) ? L('U14 · Vacuum league', 'زیر ۱۴ سال · لیگ جاروبرقی') : LEAGUE;
  fit();
  resetSim();
  refresh();
  requestAnimationFrame(loop);
})();
