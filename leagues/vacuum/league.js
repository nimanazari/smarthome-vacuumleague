/* ============================================================
   leagues/vacuum/league.js  —  the vacuum league.

   Everything this league IS lives in this folder:
       league.js        the rule engine + the group card (this file)
       robot.js         its own 3D model
       <division>/rules.js     one sub-league per folder
       <division>/program.py   the starter program that sub-league loads
   Nothing outside this folder needs to change when you change a rule
   here, and copying the folder carries the whole league with it.
   See MODULARITY.md at the project root for the contract.
   ============================================================ 
   ---------------------------------------------------------

   the Smart Home vacuum league.

   All three age divisions share ONE rule engine and differ only in
   which rules are switched on:

     FS   First Step  · a quiet house: no pets, no wet floor, gentle
                        penalties. Just drive and clean.
     U14              · the full house: cat, dog, wet floor, stealing.
     U19              · U14 plus the BATTERY and the charging pad.

   Nothing here touches physics — it reads a World (physics.js) and
   applies rules to it. That is why a completely different league can
   sit next to this file without either one knowing about the other.
   ============================================================ */
(function (root) {
  'use strict';

  const PENALTY_TILES = 5;    // tiles lost on a relocate (manual or automatic)
  const WET_PENALTY = 2;      // tiles lost each time a robot drives onto a wet tile
  // On a draw the match keeps going: +10s first, then +5s each time
  const OVERTIME_STEPS = [10, 5, 5, 5, 5, 5];

  // ---- battery model (U19) — the pack itself lives in robot-battery.js ----
  // An EMPTY battery no longer parks the robot for good: it LIMPS at a
  // crawl (15% speed), so a dead robot can still drag itself onto the pad.
  // Managing the battery so you never have to crawl is still the discipline.
  const BATTERY = { drive: 100 / 60, charge: 25, limp: 0.15, dockR: 0.32,
    fixed: { x: 7.1875, y: 5.9375 } };   // the dock lives by the east shelf, like a real one

  // ---- the dust bin (U19, SINGLE PLAYER only) ----
  // A real robot cannot clean a whole house on one bin-load. Every DUMP_EVERY
  // tiles the bin is FULL and the robot cleans nothing at all until it drives
  // to the emptying station and empties it. The station is its own piece of
  // furniture on the map (`t: 'dump'`), nowhere near the charging pad — the
  // two errands are separate trips, and planning them is the whole exercise.
  // Head-to-head matches never fill up: the bin is the solo discipline.
  const DUMP_EVERY = 30;

  class VacuumMode {
    constructor(world, cfg) {
      this.world = world;
      this.cfg = cfg || {};
      const r = this.rules = Object.assign({
        pets: true,          // is the cat / dog in the house?
        wet: true,           // do puddles cost tiles?
        steal: true,         // can you re-clean a tile the rival owns?
        battery: false,      // U19: battery + charging pad
        dump: false,         // U19: the emptying bin - reach it once, +5
        finalMode: false,    // the cat erases painted tiles
        penalty: PENALTY_TILES,
        overtime: OVERTIME_STEPS.slice(),
      }, cfg.rules || {});

      this.scores = { red: 0, blue: 0 };
      this.overtime = r.overtime.slice();

      if (!r.pets) { world.cat.enabled = false; world.dog.enabled = false; }

      // ---- the charging station (U19) ----
      // A map may carry a `dock` OBJECT (placed and ROTATED in the Map Maker):
      // that is where the station stands and which way its bay opens. The
      // object itself never collides — the station's own walls do. Without
      // one, the league's fixed home is used, exactly as before.
      const mapObjs = (world.cfg.map && world.cfg.map.objects) || [];
      const dockObj = mapObjs.filter((o) => o.t === 'dock')[0] || null;
      let needsRefresh = false;
      if (dockObj) {
        for (let i = world.obstacles.length - 1; i >= 0; i--) {
          if (world.obstacles[i].type === 'dock') { world.obstacles.splice(i, 1); needsRefresh = true; }
        }
        // rebuild NOW: the Pack validates its fixed spot against the solids,
        // and the dock object's own ghost must not veto its own station
        if (needsRefresh) { world.refreshStatics(); needsRefresh = false; }
      }
      const packCfg = dockObj
        ? Object.assign({}, BATTERY, { fixed: { x: dockObj.x, y: dockObj.y } })
        : BATTERY;
      this.pack = r.battery ? new root.RobotBattery.Pack(world, packCfg) : null;
      this.dock = this.pack ? this.pack.dock : null;
      if (this.dock && dockObj) this.dock.rot = ((dockObj.rot || 0) % 4 + 4) % 4;

      // ---- the emptying station (U19, `dump: true`): a real bin on the map ----
      // (`t: 'dump'` in the Map Maker). It stays solid, so "reach it" means
      // pulling up next to it like a real robot at a real base.
      //
      //   two players  — reach it once, +5 on the final total (unchanged)
      //   ONE player   — the bin fills as you clean: every `dumpEvery` tiles
      //                  the robot is full and cleans NOTHING until it comes
      //                  here and empties. That is the U19 solo discipline.
      this.solo = world.teams.length < 2;
      this.dumpZone = null;
      this.dumpDone = { red: false, blue: false };
      this.bonus = { red: 0, blue: 0 };
      this.dust = { red: 0, blue: 0 };        // tiles in the bin right now
      this.onDump = null;                     // (color, tilesEmptied) -> void
      this.onDumpFull = null;                 // (color) -> void, fires once per load
      this.dumpEvery = 0;
      if (r.dump) {
        const dumpObj = mapObjs.filter((o) => o.t === 'dump')[0] || null;
        if (dumpObj) this.dumpZone = { x: dumpObj.x, y: dumpObj.y, r: 0.8 };
        // no station on the map means no errand to run — a map that never got
        // a bin simply plays the old way rather than trapping the robot at 30
        if (this.solo && this.dumpZone) this.dumpEvery = r.dumpEvery || DUMP_EVERY;
      }

      // dockBox (a match setting, like FINAL mode): the real-vacuum charging
      // HOME — three walls around the station, open to the WEST only. One way
      // in, and the rival cannot shove a charging robot off its pad.
      if (this.dock && r.dockBox) {
        const d = this.dock, rot = d.rot || 0;
        // the bay opens WEST at rot 0 and turns with the object — same quarter
        // turns as every other Map-Maker piece
        const spin = (dx, dy) => { for (let k = 0; k < rot; k++) { const t2 = dx; dx = -dy; dy = t2; } return [dx, dy]; };
        const base = [
          [0.46, 0, 0.08, 1.0],       // back
          [0, 0.46, 1.0, 0.08],       // one lip
          [0, -0.46, 1.0, 0.08],      // the other
        ];
        for (const [odx, ody, w0, d0] of base) {
          const [dx, dy] = spin(odx, ody);
          const w = rot % 2 ? d0 : w0, dd = rot % 2 ? w0 : d0;
          world.walls.push({
            x1: d.x + dx - w / 2, y1: d.y + dy - dd / 2,
            x2: d.x + dx + w / 2, y2: d.y + dy + dd / 2, type: 'wall',
            dockbox: true,        // drawn as the station model, not as a wall
          });
        }
        needsRefresh = true;
        this.dock.boxed = true;
      }
      if (needsRefresh) world.refreshStatics();

      this.onRelocate = null;   // (color, reason, tilesLost) -> void
      this.onWet = null;        // (color, tilesLost) -> void
    }

    /* ---------------- the charging station ---------------- */

    onDock(rb) { return !!this.pack && this.pack.onDock(rb); }

    // kept so older tests / tools can still poke a single robot
    _updateBattery(rb, dt) {
      if (!this.pack || rb.battery == null) return;
      if (this.pack.onDock(rb)) { rb.battery = Math.min(100, rb.battery + this.pack.cfg.charge * dt); return; }
      const c = this.pack.cfg, idle = c.drive * c.idlePart;
      const effort = (Math.abs(rb.left) + Math.abs(rb.right)) / 2;
      rb.battery = Math.max(0, rb.battery - (idle + (c.drive - idle) * effort) * dt);
    }

    // a FLAT battery is final: speed multiplier 0 — the robot stands where it
    // died until the end of the match (the referee's hand can still move it)
    speedMul(rb) { return this.pack ? this.pack.speedMul(rb) : 1; }

    /* ---------------- the match ---------------- */

    preStep(dt) { if (this.pack) this.pack.update(dt); }

    postStep(dt) {
      const w = this.world;
      if (this.rules.finalMode && w.cat.enabled !== false) this._catErase();
      for (const k of w.teams) {
        const rb = w.robots[k];
        this._claim(rb);
        if (this.rules.wet) this._checkWet(rb);
        this._checkStuck(rb, dt);
        if (this.dumpZone &&
            Math.hypot(rb.x - this.dumpZone.x, rb.y - this.dumpZone.y) <= this.dumpZone.r) {
          if (this.dumpEvery) {
            // solo: empty the load and go back to work with a clean bin
            if (this.dust[k] > 0) {
              const emptied = this.dust[k];
              this.dust[k] = 0;
              if (this.onDump) this.onDump(k, emptied);
            }
          } else if (!this.dumpDone[k]) {
            // two players: reach it ONCE, +5 on the final total
            this.dumpDone[k] = true;
            this.bonus[k] += 5;
            if (this.onDump) this.onDump(k, 0);
          }
        }
      }
    }

    // last-touch wins: a robot can re-clean a tile the rival owns (steal it)
    _claim(rb) {
      // A FULL bin picks up nothing. The robot still drives wherever it likes —
      // it just leaves the floor exactly as dirty as it found it, so the trip to
      // the emptying station is not advice, it is the only way to score again.
      if (this.dumpEvery && this.dust[rb.color] >= this.dumpEvery) return;
      for (const t of this.world.sweep(rb)) {
        if (t.prev) {
          if (!this.rules.steal) continue;
          this.scores[t.prev]--;
        }
        this.world.owner[t.i][t.j] = rb.color;
        this.scores[rb.color]++;
        if (!this.dumpEvery) continue;
        // one tile of dust per tile cleaned — the load that must be carried back
        if (++this.dust[rb.color] >= this.dumpEvery) {
          if (this.onDumpFull) this.onDumpFull(rb.color);
          break;                      // the rest of this sweep goes uncleaned
        }
      }
    }

    // take `n` tiles back off a team (a penalty always costs painted floor)
    _burn(color, n) {
      const w = this.world;
      let removed = 0;
      for (let i = 0; i < w.cols && removed < n; i++)
        for (let j = 0; j < w.rows && removed < n; j++)
          if (w.owner[i][j] === color) { w.owner[i][j] = null; this.scores[color]--; removed++; }
      return removed;
    }

    // driving onto a wet tile costs the team WET_PENALTY tiles (once per tile)
    _checkWet(rb) {
      const cell = this.world.tileEntry(rb);
      if (!cell || this.world.terrain[cell.i][cell.j] !== 2) return;
      const lost = this._burn(rb.color, WET_PENALTY);
      if (this.onWet) this.onWet(rb.color, lost);
    }

    _checkStuck(rb, dt) {
      // Taking on charge is deliberate, not being stuck: while the robot is at
      // the station AND still filling up, the referee leaves it alone. Once it
      // is full the normal watchdog is back — camping is not cleaning.
      if (this.pack && this.pack.charging(rb)) { this.world.resetStuck(rb); return; }
      // WAITING IN LINE is legal: a low robot parked just off the pad while
      // the rival drinks is queueing, not stuck — the referee leaves it be.
      // (A FULL robot camping by the pad still gets the watchdog.)
      if (this.pack && this.dock && rb.battery != null && rb.battery < 95 &&
          Math.hypot(rb.x - this.dock.x, rb.y - this.dock.y) < 0.9) { this.world.resetStuck(rb); return; }
      if (this.world.updateStuck(rb, dt)) this.relocate(rb.color, 'stuck');
    }

    // Move a robot to a random free spot and take the penalty off its score.
    // `free` skips the tile penalty — the referee untangling a pile-up that
    // was nobody's fault should not have to fine somebody to do it.
    relocate(color, reason, free) {
      const lost = free ? 0 : this._burn(color, this.rules.penalty);
      this.world.teleport(this.world.robots[color]);
      if (this.onRelocate) this.onRelocate(color, reason || 'manual', lost);
    }

    // FINAL mode: fires once per tile the CAT enters. A painted tile turns white
    // again and the team that had painted it loses that point.
    _catErase() {
      const w = this.world, cell = w.tileEntry(w.cat, 'tileKey');
      if (!cell) return;
      const cur = w.owner[cell.i][cell.j];
      if (cur !== 'red' && cur !== 'blue') return;
      w.owner[cell.i][cell.j] = null;
      this.scores[cur]--;
    }

    /* ---------------- what the robot code sees ---------------- */

    info(robot) {
      // which room am I in? 0 until the map declares rooms (the ROOMS house
      // does); then the number of the room whose rectangle holds the robot
      let room = 0;
      const rooms = this.world.cfg.map && this.world.cfg.map.rooms;
      if (rooms) {
        for (const r of rooms) {
          if (robot.x >= r.x1 && robot.x <= r.x2 && robot.y >= r.y1 && robot.y <= r.y2) { room = r.id; break; }
        }
      }
      const out = {
        // U19 only — 100 and no dock when the battery rule is off
        battery: robot.battery != null ? robot.battery : 100,
        dock: this.dock,
        room: room,
        // U19 solo only — where the emptying station is, and how full I am
        dumpZone: this.dumpEvery ? this.dumpZone : null,
        dust: this.dumpEvery ? this.dust[robot.color] : 0,
        dustMax: this.dumpEvery,
        dustFull: !!(this.dumpEvery && this.dust[robot.color] >= this.dumpEvery),
      };
      // HOW CLEAN IS EACH ROOM, for me: clean1..clean3 are the percent of a
      // room's floor tiles wearing MY colour — so a robot can decide "bedroom 1
      // is done, go find the kitchen" instead of wandering blind
      if (rooms) {
        const w = this.world, t = w.cfg.tile != null ? w.cfg.tile : (w.cfg.tileSize || 0.625);
        for (const r of rooms) {
          let mine = 0, all = 0;
          for (let i = 0; i < w.cols; i++) {
            for (let j = 0; j < w.rows; j++) {
              const cx = (i + 0.5) * t, cy = (j + 0.5) * t;
              if (cx < r.x1 || cx > r.x2 || cy < r.y1 || cy > r.y2) continue;
              if (w.owner[i][j] === 'blocked' || w.terrain[i][j] !== 0) continue;
              all++;
              if (w.owner[i][j] === robot.color) mine++;
            }
          }
          out['clean' + r.id] = all ? Math.round(mine / all * 100) : 0;
        }
      }
      return out;
    }

    // after a LIVE house edit the floor is the only truth: recount each side's
    // tiles straight off the grid (furniture may have buried or freed some)
    recount() {
      const w = this.world;
      for (const c of ['red', 'blue']) {
        let n = 0;
        for (let i = 0; i < w.cols; i++) for (let j = 0; j < w.rows; j++) if (w.owner[i][j] === c) n++;
        this.scores[c] = n;
      }
    }

    // the pill under the clock: the pad, plus the solo bin gauge
    _chip() {
      const bits = [];
      if (this.dock) bits.push('&#9889; PAD ' + Math.round(this.dock.x * 100) + ' , ' + Math.round(this.dock.y * 100));
      if (this.dumpEvery) {
        const n = this.dust.red;
        bits.push(n >= this.dumpEvery
          ? '<b style="color:#ff8a8a">&#128465; BIN FULL &mdash; GO EMPTY</b>'
          : '&#128465; BIN ' + n + '/' + this.dumpEvery);
      }
      return bits.length ? bits.join(' &nbsp;&middot;&nbsp; ') : null;
    }

    // extra values for the scoreboard
    hud() {
      const w = this.world;
      const pct = (n) => (w.totalTiles ? (n / w.totalTiles) * 100 : 0);
      const cell = (k) => ({
        num: pct(this.scores[k]).toFixed(1) + '<small>%</small>',
        label: 'of the house', pct: Math.min(100, pct(this.scores[k])),
      });
      return {
        scoreLabel: 'tiles cleaned',
        metric: { red: cell('red'), blue: cell('blue') },
        center: 'HOUSE <b>' + pct(this.scores.red + this.scores.blue).toFixed(1) + '%</b> CLEAN',
        // the pad's coordinates, and — solo — how full the bin is. A full bin
        // shouts, because from that moment nothing the robot does counts.
        chip: this._chip(),
        battery: !!this.pack,
        dock: this.dock,
        charging: this.pack ? this.pack.chargingFlags() : null,
      };
    }

    result() {
      const t = (k) => this.scores[k] + (this.bonus ? this.bonus[k] : 0);
      if (t('red') > t('blue')) return 'red';
      if (t('blue') > t('red')) return 'blue';
      return 'draw';
    }
  }

  /* ================= the three divisions ================= */

  const L = root.Leagues;
  const mk = (world, cfg) => new VacuumMode(world, cfg);

  L.registerGroup({
    id: 'vacuum',
    // this league's OWN map editor, inside this folder — the game page
    // opens whatever is named here and knows no league by name
    mapmaker: 'leagues/vacuum/mapmaker.html',
    // ready-made brains a team can pick instead of writing one.
    // The three champions are COMPLETE reference programs — one per
    // division, the ceiling a starter can be grown toward.
    bots: [
      { file: 'leagues/vacuum/bots/champ_fs.py', label: '🏆 قهرمان FS — کد کامل' },
      { file: 'leagues/vacuum/bots/champ_u14.py', label: '🏆 قهرمان U14 — کد کامل' },
      { file: 'leagues/vacuum/bots/champ_u19.py', label: '🏆 قهرمان U19 — کد کامل' },
      { file: 'leagues/vacuum/bots/wallfollow.py', label: 'Wall-follow' },
      { file: 'leagues/vacuum/bots/easymoves.py', label: 'Easy moves' },
      { file: 'leagues/vacuum/bots/hunter.py', label: 'Hunter' },
      { file: 'leagues/vacuum/bots/colorsensor.py', label: 'Colour sensor' },
      { file: 'leagues/vacuum/bots/goto.py', label: 'Goto patrol' },
      { file: 'leagues/vacuum/bots/battery.py', label: 'Battery runner' }
    ],
    icon: '🧹',
    accent: '#4d8bff',
    /* modular: this group's house lives HERE (see HOUSE just below) —
       editing it can never touch another league's floor plan */
    name: { en: 'Vacuum Cleaner', fa: 'جاروبرقی هوشمند' },
    tagline: { en: 'Clean the most floor', fa: 'بیشترین کف را تمیز کن' },
    blurb: {
      en: 'The classic. Two robots, one house, and every tile you drive over turns your colour. Drive over the rival\'s tiles and you steal them back.',
      fa: 'کلاسیک مسابقات. دو ربات، یک خانه، و هر کاشی‌ای که از رویش رد شوی رنگ تو را می‌گیرد. از روی کاشی حریف رد شوی، پسش می‌گیری.',
    },
  });

  /* ---------------- the houses ----------------
     Every floor plan is ITS OWN FILE under maps/ — one map, one file —
     loaded before this one (the `pre:` list in leagues/manifest.js).
     Edit a house there and nothing else moves. */
  const { HOUSE, ROOMS, GROWN, GROWN_ROOMS, OPEN, STANDARD } = root.VacuumMaps;

  // the picker lists a group's own maps right after the official one
  L.getGroup('vacuum').maps = [
    { name: 'خانه‌ی استاندارد ۲۲×۲۲ (در + چمن) · The STANDARD house', map: STANDARD },
    { name: 'خانه‌ی اتاق‌دار کوچک ۱۶×۱۶ · Cosy rooms house', map: ROOMS },
    { name: 'خانه‌ی کلاسیک ۱۶×۱۶ · Classic house (no rooms)', map: HOUSE },
    { name: 'خانه‌ی بزرگ بدون اتاق ۲۲×۲۲ · Big open-plan house', map: GROWN },
    { name: 'سالن تمرین ۲۲×۲۲ · Open training hall', map: OPEN },
  ];

  /* ---------------- the TECHNICAL CHALLENGE ladder ----------------
     Small single-skill missions, one rung each: a solo match with its own
     clock, its own map and ONE pass line. The game page renders whatever a
     group declares under `tech:` and knows no mission by name — a mission
     brings its own `check(engine, st)` (progress: value / target) and an
     optional `onTick(engine, st)` that may set st.fail to end the run.
     The code that drives is the team's own editor code for that division —
     the ladder is a reason to make the program better, rung by rung. */

  // rung 2's map: the official house with the red corner FENCED IN — three
  // eyes and the bumper are the only way out. The pen is cleared of clutter
  // and its door opens north; the wet pair is mopped out (it is an FS rung).
  const PEN = (() => {
    const m = JSON.parse(JSON.stringify(HOUSE));
    m.name = 'vacuum-pen'; m.league = 'vacuum';
    m.rugs = m.rugs.filter((g) => g.kind !== 'wet');
    m.objects = m.objects.filter((o) => o.t !== 'dining' && o.t !== 'trash');
    m.walls.push(
      { x: 3.125, y: 1.5625, w: 0.15, d: 3.125 },   // east fence of the pen
      { x: 0.9375, y: 3.125, w: 1.875, d: 0.15 }    // north fence — the gap is the door
    );
    return m;
  })();

  L.getGroup('vacuum').tech = {
    title: { fa: 'چالش فنی', en: 'Technical Challenge' },
    blurb: {
      fa: 'مأموریت‌های کوچک و پله‌پله — هر پله یک مهارت. کدِ همان ادیتور می‌راند: قبول شدی، برو پله‌ی بعد؛ رد شدی، برنامه‌ات را بهتر کن و دوباره بیا.',
      en: 'Small laddered missions — one skill per rung. Your editor code drives; pass a rung and climb, fail and improve the program.',
    },
    missions: [
      {
        id: 'first-clean', icon: '🧹', league: 'fs', seconds: 60,
        title: { fa: 'پله‌ی ۱ — اولین تمیزکاری', en: 'Step 1 — First clean' },
        goal: { fa: '۲۵ کاشی را در ۶۰ ثانیه تمیز کن', en: 'clean 25 tiles in 60 s' },
        teach: { fa: 'راندن و دور شدن از دیوار (شاخه‌ی front)', en: 'driving + the front branch' },
        check: (e) => ({ value: e.scores.red, target: 25 }),
      },
      {
        id: 'corner-escape', icon: '🧱', league: 'fs', seconds: 90, map: PEN,
        title: { fa: 'پله‌ی ۲ — فرار از کنج', en: 'Step 2 — Corner escape' },
        goal: { fa: 'از حصار بیرون بیا و ۲۰ کاشی تمیز کن', en: 'escape the pen, clean 20 tiles' },
        teach: { fa: 'واکنش به bumper و مقدار timer', en: 'bumper reactions + the timer' },
        check: (e) => ({ value: e.scores.red, target: 20 }),
      },
      {
        id: 'no-purple', icon: '🟪', league: 'u14', seconds: 120,
        title: { fa: 'پله‌ی ۳ — فرش بنفش ممنوع', en: 'Step 3 — Skip the purple rug' },
        goal: { fa: '۳۰ کاشی تمیز کن بدون این‌که روی فرش بنفش بروی', en: 'clean 30 tiles, never touch the purple rug' },
        teach: { fa: 'سنسور رنگ: elif color == purple', en: 'the colour sensor' },
        onTick: (e, st) => {
          const rb = e.robots.red;
          const i = Math.floor(rb.x / e.cfg.tile), j = Math.floor(rb.y / e.cfg.tile);
          if (i >= 0 && i < e.cols && j >= 0 && j < e.rows && e.terrain[i][j] === 3) {
            st.fail = { fa: 'روی فرش بنفش رفتی', en: 'touched the purple rug' };
          }
        },
        check: (e) => ({ value: e.scores.red, target: 30 }),
      },
      {
        id: 'rooms', icon: '🚪', league: 'u14', seconds: 150, map: ROOMS,
        title: { fa: 'پله‌ی ۴ — اتاق‌به‌اتاق', en: 'Step 4 — Room by room' },
        goal: { fa: 'اتاق‌خواب ۱ را تا ۵۰٪ تمیز کن (clean2)', en: 'clean bedroom 1 to 50% (clean2)' },
        teach: { fa: 'room و فرش‌های نشانه‌ی دم در', en: 'rooms + the door-marker rugs' },
        check: (e) => ({ value: (e.mode.info(e.robots.red).clean2 || 0), target: 50, unit: '٪' }),
      },
      {
        id: 'battery-run', icon: '⚡', league: 'u19', seconds: 150,
        title: { fa: 'پله‌ی ۵ — قبل از خاموشی برگرد', en: 'Step 5 — Home before dark' },
        goal: { fa: '۲۸ کاشی تمیز کن و نگذار باتری به صفر برسد', en: 'clean 28 tiles, never let the battery hit 0%' },
        teach: { fa: 'برنامه‌ریزی سفر شارژ: battery و goto(dockx, docky)', en: 'battery trips: battery + goto(dockx, docky)' },
        onTick: (e, st) => {
          const b = e.robots.red.battery;
          if (b != null && b <= 0) st.fail = { fa: 'باتری تمام شد و ربات همان‌جا خاموش ماند', en: 'the battery hit 0%' };
        },
        check: (e) => ({ value: e.scores.red, target: 28 }),
      },
    ],
  };

  // Everything this league declares is exported, so each sub-league folder can
  // pull exactly what it needs without reaching into another league.
  const api = { PENALTY_TILES, WET_PENALTY, OVERTIME_STEPS, BATTERY, VacuumMode, mk, HOUSE, ROOMS, GROWN, GROWN_ROOMS };
  root.VacuumLeague = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
