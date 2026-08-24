/* ============================================================
   physics.js  —  the league-agnostic half of the simulator.

   A World is a house: floor tiles, furniture, walls, rugs, pets and
   robot bodies. It knows how things MOVE and COLLIDE and what the
   sensors see — and nothing at all about scores, batteries, timers
   or who wins. Every league (leagues.js) drives one of these and
   adds its own rules on top, so a new league never has to touch the
   physics again.

   Standalone on purpose: it only needs sensors.js (ray math) and,
   optionally, homeobjects.js (the furniture footprint table).
   Coordinates: x,y in metres, origin at the corner (0,0),
   heading in radians, counter-clockwise.
   ============================================================ */
(function (root) {
  'use strict';

  const SENSORS = root.RobotSensors ||
    (typeof require !== 'undefined' ? require('./sensors.js') : null);
  // the parts catalogue is optional: without it a robot just uses the stock rig
  const RP = () => root.RobotParts || { CATALOG: {} };

  const DEFAULTS = {
    W: 10, H: 10,        // house size (metres)
    tile: 0.625,         // tile size (metres) -> 16x16 = 256 tiles
    robotRadius: 0.24,   // robot radius (metres)
    maxRange: 2.0,       // distance-sensor range (metres) -> 200 cm to controllers
    maxSpeed: 1.0,       // wheel speed at full throttle (wheel value 25 -> this) (m/s)
    wheelBase: 0.5,      // distance between wheels (metres) — tuned for smooth turns
  };

  const RUG_SPEED = 0.5;        // a robot crawls at half speed on a rug
  const STUCK_SECONDS = 15;     // barely moving this long -> the watchdog fires
  const STUCK_RADIUS = 0.85;    // "barely moving" means inside this circle

  const clamp = (v, lo, hi) => (v < lo ? lo : (v > hi ? hi : v));

  // mulberry32: a tiny seedable PRNG. Give the World a `seed` and every random
  // decision it makes (relocation target, post-relocation heading, the dock's
  // fallback spot) becomes reproducible — {seed, map, two programs} then
  // replays the exact same match on a fixed timestep. No seed = Math.random,
  // exactly as before.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The classic official house, used whenever no custom map is given.
  const OFFICIAL = {
    obstacles: [
      { x1: 4.00, y1: 0.20, x2: 7.50, y2: 1.15, type: 'sofa' },
      { x1: 5.00, y1: 2.00, x2: 6.40, y2: 3.00, type: 'table' },
      { x1: 2.50, y1: 8.90, x2: 5.60, y2: 9.80, type: 'tv' },
      { x1: 0.20, y1: 7.20, x2: 2.20, y2: 9.80, type: 'bed' },
      { x1: 8.85, y1: 3.00, x2: 9.80, y2: 6.00, type: 'shelf' },
      { x1: 0.20, y1: 3.20, x2: 0.95, y2: 5.80, type: 'shelf' },
      { x1: 2.50, y1: 0.30, x2: 3.10, y2: 0.90, type: 'plant' },
      { x1: 0.35, y1: 6.10, x2: 0.95, y2: 6.70, type: 'plant' },
      { x1: 6.90, y1: 9.20, x2: 7.50, y2: 9.80, type: 'plant' },
      // the lived-in touches: a pouf by the window, a dining table, a floor
      // lamp, the bin by the door and the cat's bowl. Mostly slim-footprint
      // props, so the cleanable floor barely shrinks.
      { x1: 8.10, y1: 6.55, x2: 8.90, y2: 7.35, type: 'pouf' },   // clear of the blue corner
      { x1: 1.30, y1: 1.60, x2: 2.70, y2: 2.60, type: 'dining' },
      { x1: 9.15, y1: 8.95, x2: 9.65, y2: 9.45, type: 'lamp' },
      { x1: 0.30, y1: 2.20, x2: 0.75, y2: 2.65, type: 'trash' },
      { x1: 6.35, y1: 9.35, x2: 6.75, y2: 9.75, type: 'petbowl' },
    ],
    rugs: [{ x1: 2.5, y1: 6.875, x2: 5.625, y2: 8.75 }],
    purples: [{ x1: 8.75, y1: 0, x2: 10, y2: 1.25 }],
  };

  class World {
    constructor(cfg = {}) {
      this.cfg = Object.assign({}, DEFAULTS, cfg);
      const c = this.cfg;
      // the match seed: every in-match random decision flows through here
      this.rand = (c.seed != null && c.seed !== '') ? mulberry32(+c.seed) : Math.random;
      // solo: a single-player world — only the red robot exists
      this.teams = cfg.teams || (cfg.solo ? ['red'] : ['red', 'blue']);

      // Custom map from the Map Maker (game/mapmaker.html). Format:
      // { cols, rows, tileSize?, objects:[{t,x,y,w,d,rot,color}], walls:[{x,y,w,d}],
      //   rugs:[{x,y,w,d,kind,color}], spawns:{red,blue,cat:{x,y,on},dog:{x,y,on}} }
      // x,y are centres in metres; rot is quarter-turns (0..3).
      // A league can ask for an ARENA instead of a house: a round platform with
      // no walls at all, that a robot can be shoved straight off. Everything
      // else (bodies, sensors, collisions) works exactly the same.
      this.arena = c.arena ? Object.assign({ r: 2.0 }, c.arena) : null;

      const m = c.map || null;
      if (this.arena) {
        // a box comfortably bigger than the platform, so nothing escapes to infinity
        c.tile = 0.5;
        c.W = c.H = Math.ceil((this.arena.r * 2 + 3) / c.tile) * c.tile;
        this.arena.x = c.W / 2; this.arena.y = c.H / 2;
      } else if (m) {
        if (m.tileSize) c.tile = m.tileSize;
        c.W = (m.cols || 16) * c.tile;
        c.H = (m.rows || 16) * c.tile;
      }
      const rectC = (o) => {   // centre+size (+rotation) -> axis-aligned rect
        const w = (o.rot % 2) ? o.d : o.w, d = (o.rot % 2) ? o.w : o.d;
        return { x1: o.x - w / 2, y1: o.y - d / 2, x2: o.x + w / 2, y2: o.y + d / 2 };
      };

      this.cols = Math.round(c.W / c.tile);
      this.rows = Math.round(c.H / c.tile);

      // ---- furniture ----
      // srcIdx = position in the map's own list, so an editor can always match a
      // model back to the object it came from even after filtering.
      this.obstacles = this.arena ? []
        : m ? (m.objects || []).map((o, idx) => Object.assign(rectC(o), { type: o.t, rot: o.rot || 0, color: o.color, srcIdx: idx }))
          : OFFICIAL.obstacles.map((o) => Object.assign({}, o));

      // Windows are pure decor: rendered on the outer wall, no physics at all
      this.decor = this.obstacles.filter((o) => o.type === 'window');
      this.obstacles = this.obstacles.filter((o) => o.type !== 'window');

      // Interior walls (Map Maker only). They collide and block sensor rays like
      // furniture, but are thin and sit on tile boundaries, so the floor on both
      // sides of them stays cleanable.
      this.walls = m ? (m.walls || []).map((wl) => Object.assign(rectC(Object.assign({ rot: 0 }, wl)), { type: 'wall' })) : [];

      // ---- DOORS: their own animated solids, never static furniture ----
      // closed = a wall the bumper and the rays feel; push it for a moment
      // and it swings open, stays open ~8 s, then falls shut again.
      this.doors = [];
      this.obstacles = this.obstacles.filter((o) => {
        if (o.type !== 'door') return true;
        this.doors.push({ x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, rot: o.rot || 0,
          open: false, anim: 0, touch: 0, openT: 0 });
        return false;
      });

      this._buildCollisionShapes();

      // ---- special floor areas (drive-over, not cleanable) ----
      // rug families: green slows (terrain 1), purple/orange/cyan are flat
      // no-point markers the colour sensor can tell apart, wet punishes
      const rugsOf = (kind) => (m.rugs || []).filter((r) => (kind
        ? r.kind === kind
        : (r.kind !== 'purple' && r.kind !== 'wet' && r.kind !== 'orange' && r.kind !== 'cyan')));
      const rugRects = (kind) => (this.arena || !m) ? []
        : rugsOf(kind).map((r) => Object.assign(rectC(Object.assign({ rot: 0 }, r)), { color: r.color, round: r.round }));
      this.rugs = this.arena ? []
        : m ? rugRects(null) : OFFICIAL.rugs.map((r) => Object.assign({}, r));
      this.purples = this.arena ? []
        : m ? rugRects('purple') : OFFICIAL.purples.map((r) => Object.assign({}, r));
      this.oranges = rugRects('orange');
      this.cyans = rugRects('cyan');
      this.puddles = (this.arena || !m) ? []
        : rugsOf('wet').map((r) => rectC(Object.assign({ rot: 0 }, r)));

      // Wall + obstacle edges as line segments (for sensor rays)
      this.segments = this._buildSegments();
      this._segsStatic = this.segments;
      this._refreshDoorSolids();

      this._buildTiles();
      this._buildBodies(m);
    }

    /* ---------------- LIVE editing (the Sims button) ----------------
       The match page moves / adds / removes furniture WHILE a match runs.
       Everything static is rebuilt — collision shapes, sensor segments, the
       blocked overlay — and the tiles a team already painted stay painted
       wherever the floor is still open. Nobody gets buried: anything left
       inside the new furniture is pushed straight out. */
    refreshStatics() {
      const prevOwner = this.owner;
      this._buildCollisionShapes();
      this.segments = this._buildSegments();
      this._segsStatic = this.segments;
      this._refreshDoorSolids();
      this._buildTiles();
      if (prevOwner) {
        for (let i = 0; i < this.cols; i++) {
          for (let j = 0; j < this.rows; j++) {
            const was = prevOwner[i] && prevOwner[i][j];
            if ((was === 'red' || was === 'blue') && this.owner[i][j] === null) this.owner[i][j] = was;
          }
        }
      }
      for (const k of this.teams) { const rb = this.robots[k]; this.resolveObstacles(rb); this.resolveWalls(rb); }
      for (const cr of this.critters) if (cr.enabled !== false) { this.resolveObstacles(cr); this.resolveWalls(cr); }
    }

    /* ---------------- map -> collision shapes ---------------- */

    // Props are NOT all solid boxes: a robot drives under a table, a lamp only
    // blocks its foot and a pouf is round. HomeObjects publishes the true
    // footprint of every prop it can draw, and the physics is built from it.
    _buildCollisionShapes() {
      const FOOT = (root.HomeObjectsFootprints && root.HomeObjectsFootprints.FOOTPRINTS) || {};
      // a local offset rotated by `rot` quarter turns (matches how models are spun)
      const rotXY = (x, y, rot) => {
        for (let k = 0; k < ((rot % 4) + 4) % 4; k++) { const t2 = x; x = -y; y = t2; }
        return [x, y];
      };
      this.pillars = [];   // every physics circle
      this.columns = [];   // the subset the renderer draws as a stone column
      const rects = [];
      for (const o of this.obstacles) {
        const wW = o.x2 - o.x1, dW = o.y2 - o.y1, rot = (o.rot || 0) % 4;
        const cx = (o.x1 + o.x2) / 2, cy = (o.y1 + o.y2) / 2;
        const prof = FOOT[o.type];
        if (!prof) { rects.push(o); continue; }          // solid from the floor up
        o.shaped = true;                                 // its own AABB no longer applies
        const uw = rot % 2 ? dW : wW, ud = rot % 2 ? wW : dW;   // dims the model was built with
        for (const sh of prof(uw, ud)) {
          if (sh.c) {
            const p = rotXY(sh.c[0], sh.c[1], rot);
            const cc = { x: cx + p[0], y: cy + p[1], r: sh.c[2], color: o.color, type: o.type };
            this.pillars.push(cc);
            if (o.type === 'columnR') this.columns.push(cc);
          } else {
            const p = rotXY(sh.r[0], sh.r[1], rot);
            const hw = rot % 2 ? sh.r[3] : sh.r[2], hd = rot % 2 ? sh.r[2] : sh.r[3];
            rects.push({ x1: cx + p[0] - hw, y1: cy + p[1] - hd, x2: cx + p[0] + hw, y2: cy + p[1] + hd, type: o.type });
          }
        }
      }
      this._solidsStatic = rects.concat(this.walls);
      this._refreshDoorSolids();
      // a round column is drawn from this.columns, so drop its (empty) furniture model
      this.obstacles = this.obstacles.filter((o) => o.type !== 'columnR');
    }

    // closed (or still-swinging) doors join the solid + sensor worlds;
    // fully open ones leave them — called whenever a door changes state
    _refreshDoorSolids() {
      const closed = (this.doors || []).filter((d) => d.anim < 0.7);
      this._solids = (this._solidsStatic || []).concat(closed.map((d) => ({ x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, type: 'door' })));
      if (this._segsStatic) {
        this.segments = this._segsStatic.concat(closed.map((d) => [
          { x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y1 },
          { x1: d.x2, y1: d.y1, x2: d.x2, y2: d.y2 },
          { x1: d.x2, y1: d.y2, x2: d.x1, y2: d.y2 },
          { x1: d.x1, y1: d.y2, x2: d.x1, y2: d.y1 },
        ]).flat());
      }
    }

    // the door clock: touching a closed door for a moment pushes it open
    stepDoors(dt, bodies) {
      let changed = false;
      for (const d of (this.doors || [])) {
        if (!d.open) {
          let touching = false;
          for (const b of bodies) {
            const nx = clamp(b.x, d.x1, d.x2), ny = clamp(b.y, d.y1, d.y2);
            if (Math.hypot(b.x - nx, b.y - ny) < b.r + 0.06) { touching = true; break; }
          }
          d.touch = touching ? d.touch + dt : 0;
          if (d.touch > 0.25) { d.open = true; d.openT = 0; changed = true; }
          if (d.anim > 0) { d.anim = Math.max(0, d.anim - dt * 2); }
        } else {
          const was = d.anim;
          d.anim = Math.min(1, d.anim + dt * 2);
          if (was < 0.7 && d.anim >= 0.7) changed = true;
          d.openT += dt;
          if (d.openT > 8) {
            // fall shut — but never ON a robot standing in the frame
            let blockedBy = false;
            for (const b of bodies) {
              const nx = clamp(b.x, d.x1, d.x2), ny = clamp(b.y, d.y1, d.y2);
              if (Math.hypot(b.x - nx, b.y - ny) < b.r + 0.10) { blockedBy = true; break; }
            }
            if (!blockedBy) { d.open = false; d.touch = 0; d.anim = 0.69; changed = true; }
          }
        }
      }
      if (changed) this._refreshDoorSolids();
    }

    _buildSegments() {
      const c = this.cfg, segs = [];
      const add = (x1, y1, x2, y2) => segs.push({ x1, y1, x2, y2 });
      // An arena has NO walls — that is the whole point. A distance sensor out
      // there sees nothing but the rival, which is exactly right for a dohyo.
      if (this.arena) return segs;
      add(0, 0, c.W, 0); add(c.W, 0, c.W, c.H); add(c.W, c.H, 0, c.H); add(0, c.H, 0, 0);
      for (const o of this._solids) {
        add(o.x1, o.y1, o.x2, o.y1); add(o.x2, o.y1, o.x2, o.y2);
        add(o.x2, o.y2, o.x1, o.y2); add(o.x1, o.y2, o.x1, o.y1);
      }
      return segs;
    }

    /* ---------------- the floor grid ---------------- */

    // owner:   null = untouched · a team colour = painted · 'blocked' = under furniture
    // terrain: 0 = plain floor · 1 = rug · 2 = wet · 3 = small rug
    // free:    for a tile furniture only PARTLY covers, the open points left on it
    _buildTiles() {
      this.owner = []; this.terrain = []; this.free = []; this.terrainColor = [];
      this.totalTiles = 0;
      for (let i = 0; i < this.cols; i++) {
        this.owner[i] = []; this.terrain[i] = []; this.free[i] = []; this.terrainColor[i] = [];
        for (let j = 0; j < this.rows; j++) {
          const cov = this._tileCoverage(i, j);
          const blocked = cov.freeFrac < 0.1;      // essentially all under furniture
          const ter = blocked ? 0 : this._terrainAt(i, j);
          this.owner[i][j] = blocked ? 'blocked' : null;
          this.terrain[i][j] = ter;
          this.terrainColor[i][j] = ter ? this._lastTerrainColor : null;
          this.free[i][j] = (!blocked && cov.freeFrac < 1) ? cov.pts : null;
          if (!blocked && ter === 0) this.totalTiles++;
        }
      }
    }

    // A tile belongs to whatever its CENTRE sits on — that is the point the robot
    // must actually reach, so counts stay honest instead of over-blocking.
    _terrainAt(i, j) {
      const t = this.cfg.tile, cx = (i + 0.5) * t, cy = (j + 0.5) * t;
      const on = (r) => cx > r.x1 && cx < r.x2 && cy > r.y1 && cy < r.y2;
      // remember WHICH rug covers the tile, so a renderer can use its colour
      this._lastTerrainColor = null;
      for (const p of this.puddles) if (on(p)) return 2;
      for (const p of this.purples) if (on(p)) { this._lastTerrainColor = p.color || null; return 3; }
      for (const p of this.oranges) if (on(p)) { this._lastTerrainColor = p.color || null; return 4; }
      for (const p of this.cyans) if (on(p)) { this._lastTerrainColor = p.color || null; return 5; }
      for (const r of this.rugs) if (on(r)) { this._lastTerrainColor = r.color || null; return 1; }
      return 0;
    }

    // How much of a tile is actually open floor? Sampling a grid over the tile
    // tells us whether the furniture covers all of it (-> black, worth nothing)
    // or only part of it (-> still worth a point, cleanable around the object).
    _tileCoverage(i, j) {
      const t = this.cfg.tile, S = 6;
      const pts = []; let freeN = 0;
      for (let a = 0; a < S; a++) {
        for (let b = 0; b < S; b++) {
          const x = i * t + (a + 0.5) * t / S;
          const y = j * t + (b + 0.5) * t / S;
          if (this.pointBlocked(x, y)) continue;
          freeN++; pts.push({ x, y });
        }
      }
      return { freeFrac: freeN / (S * S), pts };
    }

    // is this spot of floor under something? (the same shapes the robot collides
    // with, so what you see blocked is exactly what cannot be cleaned)
    pointBlocked(x, y) {
      for (const o of this._solids) {
        if (o.type === 'wall') continue;              // walls sit on tile edges
        if (x > o.x1 && x < o.x2 && y > o.y1 && y < o.y2) return true;
      }
      for (const pl of this.pillars) {
        const dx = x - pl.x, dy = y - pl.y;
        if (dx * dx + dy * dy < pl.r * pl.r) return true;
      }
      return false;
    }

    // true when a circle of radius r at (x,y) touches no furniture and no wall
    circleFree(x, y, r) {
      for (const o of this._solids) {
        const cx = Math.max(o.x1, Math.min(x, o.x2)), cy = Math.max(o.y1, Math.min(y, o.y2));
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < r * r) return false;
      }
      for (const pl of this.pillars) {
        const dx = x - pl.x, dy = y - pl.y, rr = r + pl.r;
        if (dx * dx + dy * dy < rr * rr) return false;
      }
      return true;
    }

    tileOf(x, y) {
      const t = this.cfg.tile;
      const i = Math.floor(x / t), j = Math.floor(y / t);
      if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) return null;
      return { i, j };
    }

    randomFreePos() {
      const t = this.cfg.tile;
      for (let k = 0; k < 300; k++) {
        const i = Math.floor(this.rand() * this.cols), j = Math.floor(this.rand() * this.rows);
        if (this.owner[i][j] === 'blocked') continue;
        // a HALF-covered tile is the edge of a bed or a sofa — dropping a
        // robot there is how it ends up wedged under the furniture. Only a
        // FULLY open tile (free[i][j] === null) may receive a teleport.
        if (this.free[i][j] !== null) continue;
        const x = (i + 0.5) * t, y = (j + 0.5) * t;
        let ok = true;
        for (const c of this.teams) { const o = this.robots[c]; if (Math.hypot(o.x - x, o.y - y) < 0.75) { ok = false; break; } }
        if (ok) return { x, y };
      }
      return { x: this.cfg.W / 2, y: this.cfg.H / 2 };
    }

    // One open spot that is roughly the same distance from every robot, so a
    // league can drop a charging pad / a ring / a package without favouring a
    // team. opts: { clear, free, margin, minFrom, avoid, avoidR, pool }
    fairSpot(opts) {
      opts = opts || {};
      const bodies = opts.from || this.teams.map((k) => this.robots[k]);
      const margin = opts.margin || 0;
      const spots = [];
      for (const s of this.openSpots(opts.clear)) {
        if (margin && (s.x < margin || s.y < margin || s.x > this.cfg.W - margin || s.y > this.cfg.H - margin)) continue;
        if (opts.free && !this.circleFree(s.x, s.y, opts.free)) continue;
        if (opts.avoid && Math.hypot(s.x - opts.avoid.x, s.y - opts.avoid.y) < (opts.avoidR || 0)) continue;
        let lo = Infinity, hi = -Infinity, ok = true;
        for (const b of bodies) {
          const d = Math.hypot(s.x - b.x, s.y - b.y);
          if (opts.minFrom && d < opts.minFrom) { ok = false; break; }
          if (d < lo) lo = d;
          if (d > hi) hi = d;
        }
        if (!ok) continue;
        spots.push({ x: s.x, y: s.y, fair: hi - lo });
      }
      if (!spots.length) return { x: this.cfg.W / 2, y: this.cfg.H / 2 };
      // random, but only out of the fairest slice of the house
      spots.sort((a, b) => a.fair - b.fair);
      const pool = spots.slice(0, Math.max(1, Math.floor(spots.length * (opts.pool || 0.5))));
      return pool[Math.floor(this.rand() * pool.length)];
    }

    // Every open tile of plain floor, as a list — leagues use it to drop props
    // (a charging pad, a package, a target) somewhere fair and reachable.
    openSpots(clearance) {
      const t = this.cfg.tile, out = [];
      const clear = clearance != null ? clearance : this.cfg.robotRadius + 0.06;
      for (let i = 0; i < this.cols; i++) {
        for (let j = 0; j < this.rows; j++) {
          if (this.owner[i][j] === 'blocked' || this.terrain[i][j] !== 0) continue;
          const x = (i + 0.5) * t, y = (j + 0.5) * t;
          if (!this.circleFree(x, y, clear)) continue;
          if (x < clear || y < clear || x > this.cfg.W - clear || y > this.cfg.H - clear) continue;
          out.push({ x, y, i, j });
        }
      }
      return out;
    }

    /* ---------------- bodies ---------------- */

    _buildBodies(m) {
      const c = this.cfg, sp = (m && m.spawns) || {};
      const rSp = sp.red || { x: 1.8, y: 1.8 };
      const bSp = sp.blue || { x: c.W - 1.8, y: c.H - 1.8 };
      // starting facing comes from the Map Maker as quarter turns (0 = +x);
      // defaults keep the classic setup: red faces right, blue faces left
      const rHead = (rSp.rot != null ? rSp.rot : 0) * Math.PI / 2;
      const bHead = (bSp.rot != null ? bSp.rot : 2) * Math.PI / 2;
      this.robots = {
        red: { color: 'red', x: rSp.x, y: rSp.y, heading: rHead, r: c.robotRadius, left: 0, right: 0 },
        blue: { color: 'blue', x: bSp.x, y: bSp.y, heading: bHead, r: c.robotRadius, left: 0, right: 0 },
      };
      // in a solo world the blue robot simply does not exist
      if (this.teams.indexOf('blue') < 0) delete this.robots.blue;
      for (const k of this.teams) {
        const r = this.robots[k];
        r.stuckTimer = 0; r.stuckRef = { x: r.x, y: r.y };
        r.lastTileKey = -1; r.finalTileKey = -1;
        // what the team actually built. Engine overwrites this with their own.
        r.kit = root.RobotParts ? new root.RobotParts.Loadout() : null;
      }

      // The house cat: it wanders on its own and is a MOVING obstacle — the
      // robots' distance sensors see it and they cannot drive through it.
      // refX/refY + stuckT + escape form a no-progress watchdog, so a graze on a
      // plant-pot corner (which the look-ahead ray can miss) can never trap it.
      const cSp = sp.cat || { x: c.W / 2, y: c.H * 0.4 };
      this.cat = {
        x: cSp.x, y: cSp.y, heading: 0.6, r: 0.19, speed: 0.5, t: 0, pause: 0,
        turnT: 0, turnDir: 1, flip: false, nextRest: 7, moving: true,
        refX: cSp.x, refY: cSp.y, stuckT: 0, escape: 0, tileKey: -1,
        enabled: !sp.cat || sp.cat.on !== false,
        color: (sp.cat && sp.cat.color) || null,     // Map-Maker fur colour
      };

      // The dog — a second, BIGGER moving obstacle with its own personality:
      // faster, wanders in wider curves, rests less often.
      const dSp = sp.dog || { x: c.W * 0.32, y: c.H * 0.56 };
      this.dog = {
        x: dSp.x, y: dSp.y, heading: -0.4, r: 0.24, speed: 0.62, t: 0, pause: 0,
        turnT: 0, turnDir: 1, flip: false, nextRest: 12, moving: true,
        refX: dSp.x, refY: dSp.y, stuckT: 0, escape: 0, tileKey: -1,
        wanderAmp: 0.5, wanderFreq: 1.1, restEvery: 13, restLen: 1.2, turnRate: 2.6, avoidDist: 0.75,
        enabled: !sp.dog || sp.dog.on !== false,
        color: (sp.dog && sp.dog.color) || null,     // Map-Maker coat colour
      };
      this.critters = [this.cat, this.dog];
      // extra round bodies a league drops in (a guided person, an intruder, …)
      this.props = [];
      this.contactPush = false;   // sumo turns this on
      this.heatSources = [];      // burning things a flame sensor can feel
    }

    /* ---------------- sensing ---------------- */

    _raySeg(ox, oy, dx, dy, s) { return SENSORS.raySegment(ox, oy, dx, dy, s); }
    _rayCircle(ox, oy, dx, dy, cx, cy, r) { return SENSORS.rayCircle(ox, oy, dx, dy, cx, cy, r); }

    // One distance ray, cast from the robot's rim at an absolute angle.
    rayFrom(robot, ang, others) {
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const ox = robot.x + robot.r * dx, oy = robot.y + robot.r * dy;
      let best = this.cfg.maxRange;
      for (let k = 0; k < this.segments.length; k++) {
        const t = this._raySeg(ox, oy, dx, dy, this.segments[k]);
        if (t < best) best = t;
      }
      for (const o of others) {
        const tc = this._rayCircle(ox, oy, dx, dy, o.x, o.y, o.r);
        if (tc < best) best = tc;
      }
      for (const cr of this.critters) {
        if (cr.enabled === false) continue;                   // pets are obstacles too
        const tc = this._rayCircle(ox, oy, dx, dy, cr.x, cr.y, cr.r);
        if (tc < best) best = tc;
      }
      for (const p of this.props) {
        if (p.sensed === false) continue;                     // and so is a person
        // …except YOUR OWN person: a guide robot knows the hand on its handle,
        // so its rangefinders filter them out. (The camera still sees them, and
        // the RIVAL's person still blocks you like anybody else.)
        if (p.kind === 'person' && p.team === robot.color) continue;
        const tc = this._rayCircle(ox, oy, dx, dy, p.x, p.y, p.r);
        if (tc < best) best = tc;
      }
      for (const pl of this.pillars) {
        const tp = this._rayCircle(ox, oy, dx, dy, pl.x, pl.y, pl.r);     // round columns
        if (tp < best) best = tp;
      }
      return best;
    }

    _others(robot, other) {
      return other ? [other] : this.teams.map((k) => this.robots[k]).filter((r) => r !== robot);
    }

    // The classic seven directions. If the robot's loadout has no sensor
    // pointing that way, the reading is -1: you did not buy it, you cannot see it.
    readSensors(robot, other) {
      const others = this._others(robot, other);
      if (!robot.kit) {
        const out = {};
        for (const key in SENSORS.ANGLES) out[key] = this.rayFrom(robot, robot.heading + SENSORS.ANGLES[key], others);
        return out;
      }
      const slots = robot.kit.classicSlots(), out = {};
      for (const key in SENSORS.ANGLES) {
        const p = slots[key];
        out[key] = p ? this.rayFrom(robot, robot.heading + p.angle * Math.PI / 180, others) : -1;
      }
      return out;
    }

    // Everything the robot's own parts can sense, exactly as they are bolted on.
    // A part the team never bought simply is not in here.
    readKit(robot, other) {
      const kit = robot.kit;
      const others = this._others(robot, other);
      const out = { dist: [], cliff: [], has: {} };
      if (!kit) return out;
      for (const t in RP().CATALOG) out.has[t] = kit.has(t);

      for (const p of kit.rays()) out.dist.push(this.rayFrom(robot, robot.heading + p.angle * Math.PI / 180, others));

      // an edge sensor looks straight down just outside the shell
      for (const p of kit.of('cliff')) {
        const a = robot.heading + p.angle * Math.PI / 180;
        const px = robot.x + Math.cos(a) * (robot.r + 0.03);
        const py = robot.y + Math.sin(a) * (robot.r + 0.03);
        out.cliff.push(this.onFloor(px, py) ? 0 : 1);
      }

      if (kit.has('color')) out.color = this.noseColor(robot);
      // one ring round the shell, as on a real robot — but the code is told
      // which HALF of it was pressed, so "I ran into something" and "something
      // ran into my back" are two different questions
      if (kit.has('bumper')) {
        out.bumper = robot.bumper ? 1 : 0;
        out.bumperfront = robot.bumperFront ? 1 : 0;
        out.bumperback = robot.bumperBack ? 1 : 0;
      }
      if (kit.has('compass')) out.heading = robot.heading;
      if (kit.has('gps')) { out.x = robot.x; out.y = robot.y; }
      if (kit.has('gyro')) {
        // turn rate straight out of the wheels, in degrees per second
        out.turnrate = ((robot.right - robot.left) * this.cfg.maxSpeed / this.cfg.wheelBase) * 180 / Math.PI;
      }
      // The camera looks along its mount angle and NAMES what it sees:
      // 0 nothing · 1 furniture/wall · 2 the rival robot · 3 a person ·
      // 4 the cat · 5 the dog — plus the distance to it.
      if (kit.has('camera')) {
        const cam = kit.of('camera')[0];
        const ang = robot.heading + cam.angle * Math.PI / 180;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const ox = robot.x + robot.r * dx, oy = robot.y + robot.r * dy;
        const RANGE = 2.5;
        let what = 0, dist = RANGE;
        const consider = (d, code) => { if (d < dist) { dist = d; what = code; } };
        for (let i = 0; i < this.segments.length; i++) consider(this._raySeg(ox, oy, dx, dy, this.segments[i]), 1);
        for (const pl of this.pillars) consider(this._rayCircle(ox, oy, dx, dy, pl.x, pl.y, pl.r), 1);
        for (const o of others) consider(this._rayCircle(ox, oy, dx, dy, o.x, o.y, o.r), 2);
        for (const p of this.props) {
          if (p.sensed === false) continue;
          consider(this._rayCircle(ox, oy, dx, dy, p.x, p.y, p.r), p.kind === 'person' ? 3 : 1);
        }
        if (this.cat.enabled !== false) consider(this._rayCircle(ox, oy, dx, dy, this.cat.x, this.cat.y, this.cat.r), 4);
        if (this.dog.enabled !== false) consider(this._rayCircle(ox, oy, dx, dy, this.dog.x, this.dog.y, this.dog.r), 5);
        out.camsee = what;
        out.camdist = what ? dist : -1;
      }
      if (kit.has('encoder')) out.odometer = robot.odo || 0;                     // metres rolled
      if (kit.has('load')) out.motorload = robot.load || 0;                     // 0..100
      if (kit.has('heat')) {
        // the flame sensor feels the NEAREST burning thing: which way (relative
        // to the nose, -180..180, + = to the left) and how far
        let best = null, bestD = Infinity;
        for (const h of this.heatSources) {
          const d = Math.hypot(h.x - robot.x, h.y - robot.y);
          if (d < bestD) { bestD = d; best = h; }
        }
        if (best) {
          let rel = (Math.atan2(best.y - robot.y, best.x - robot.x) - robot.heading) * 180 / Math.PI;
          rel = ((rel + 180) % 360 + 360) % 360 - 180;
          out.heatdir = Math.round(rel);
          out.heatdist = bestD;
        } else { out.heatdir = 0; out.heatdist = -1; }
      }
      if (kit.has('impact')) {
        let hit = 0, ang = -1;
        for (const o of others) {
          if (Math.hypot(robot.x - o.x, robot.y - o.y) > robot.r + o.r + 0.03) continue;
          hit = 1;
          const rel = Math.atan2(o.y - robot.y, o.x - robot.x) - robot.heading;
          ang = Math.round((((rel * 180 / Math.PI) % 360) + 360) % 360);
        }
        out.impact = hit; out.impactangle = ang;
      }
      return out;
    }

    // distance from a point to the nearest wall / furniture along an angle
    rayDist(x, y, ang, maxD) {
      const dx = Math.cos(ang), dy = Math.sin(ang);
      let best = maxD;
      for (const s of this.segments) { const t = this._raySeg(x, y, dx, dy, s); if (t < best) best = t; }
      return best;
    }

    // One colour sensor, pointing straight down.
    // 0 white (floor to clean) · 1 red · 2 blue · 3 green (big rug)
    // 4 black (wall/furniture) · 5 purple rug · 6 orange rug · 7 cyan rug
    colorAt(x, y) {
      const t = this.cfg.tile;
      const i = Math.floor(x / t), j = Math.floor(y / t);
      if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) return 4;
      const o = this.owner[i][j];
      if (o === 'blocked') return 4;
      if (this.terrain[i][j] === 1) return 3;
      if (this.terrain[i][j] === 3) return 5;
      if (this.terrain[i][j] === 4) return 6;
      if (this.terrain[i][j] === 5) return 7;
      if (o === 'red') return 1;
      if (o === 'blue') return 2;
      return 0;
    }

    // The colour sensor sits at the robot's NOSE and looks down at the floor
    // just ahead. (Under the centre it would always read the robot's own colour,
    // because a tile is cleaned the instant the robot touches it.)
    noseColor(robot) {
      const a = robot.heading, d = robot.r + 0.06;
      return this.colorAt(robot.x + Math.cos(a) * d, robot.y + Math.sin(a) * d);
    }

    /* ---------------- motion ---------------- */

    integrate(robot, dt, speedMul) {
      const c = this.cfg;
      const cell = this.tileOf(robot.x, robot.y);
      let mul = (cell && this.terrain[cell.i][cell.j] === 1) ? RUG_SPEED : 1;  // rug slows you down
      if (speedMul != null) mul *= speedMul;
      const vL = robot.left * c.maxSpeed * mul, vR = robot.right * c.maxSpeed * mul;
      const v = (vL + vR) / 2, omega = (vR - vL) / c.wheelBase;
      robot.heading += omega * dt;
      robot.x += v * Math.cos(robot.heading) * dt;
      robot.y += v * Math.sin(robot.heading) * dt;
      // the wheel encoder simply counts what the wheels rolled
      robot.odo = (robot.odo || 0) + Math.abs(v) * dt;
    }

    resolveWalls(body) {
      const c = this.cfg, r = body.r;
      // in an arena there is nothing to stop you going over the edge — the only
      // limit is the safety box, so a shoved robot cannot fly off to infinity
      const pad = this.arena ? -r : r;
      body.x = clamp(body.x, pad, c.W - pad);
      body.y = clamp(body.y, pad, c.H - pad);
    }

    // true when this point of floor is solid ground (inside the arena platform,
    // or anywhere at all in a house) — what an edge sensor is looking for
    onFloor(x, y) {
      if (!this.arena) return x >= 0 && y >= 0 && x <= this.cfg.W && y <= this.cfg.H;
      return Math.hypot(x - this.arena.x, y - this.arena.y) <= this.arena.r;
    }

    // how far past the edge of the platform a body is (negative = still on it)
    overEdge(body) {
      if (!this.arena) return -1;
      return Math.hypot(body.x - this.arena.x, body.y - this.arena.y) - this.arena.r;
    }

    resolveObstacles(body) {
      const r = body.r;
      // round columns: exact circle-vs-circle push-out
      for (const pl of this.pillars) {
        let dx = body.x - pl.x, dy = body.y - pl.y;
        let d = Math.hypot(dx, dy);
        const minD = r + pl.r;
        if (d >= minD) continue;
        if (d < 1e-9) { dx = 1; dy = 0; d = 1; }
        body.x = pl.x + (dx / d) * minD;
        body.y = pl.y + (dy / d) * minD;
      }
      for (const o of this._solids) {
        const cx = clamp(body.x, o.x1, o.x2), cy = clamp(body.y, o.y1, o.y2);
        let dx = body.x - cx, dy = body.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          body.x += (dx / d) * (r - d);
          body.y += (dy / d) * (r - d);
        } else {
          const left = body.x - o.x1, right = o.x2 - body.x;
          const bottom = body.y - o.y1, top = o.y2 - body.y;
          const m = Math.min(left, right, bottom, top);
          if (m === left) body.x = o.x1 - r;
          else if (m === right) body.x = o.x2 + r;
          else if (m === bottom) body.y = o.y1 - r;
          else body.y = o.y2 + r;
        }
      }
    }

    // Two robots touching. Normally the overlap is split down the middle, but a
    // league can switch `contactPush` on (sumo!) and then whoever is driving
    // HARDER into the contact stays put and shoves the other one back.
    resolveBodies(a, b) {
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      const minD = a.r + b.r;
      if (d >= minD) return;
      if (d < 1e-9) { dx = 1; dy = 0; d = 1; }
      const sep = minD - d, nx = dx / d, ny = dy / d;
      let wa = 0.5, wb = 0.5;
      if (this.contactPush) {
        // Forward effort of each robot along the contact normal (0 = not pushing).
        // The alignment is SQUARED, so a square blade-first hit crushes a glancing
        // one — get under them nose-on and they fly; scrape them sideways and
        // nothing much happens. That is what makes flanking worth it.
        const ca = Math.cos(a.heading) * nx + Math.sin(a.heading) * ny;
        const cb = -(Math.cos(b.heading) * nx + Math.sin(b.heading) * ny);
        const ea = Math.max(0, ((a.left + a.right) / 2) * ca * Math.abs(ca));
        const eb = Math.max(0, ((b.left + b.right) / 2) * cb * Math.abs(cb));
        const tot = ea + eb;
        if (tot > 1e-6) { wa = eb / tot; wb = ea / tot; }   // the harder pusher gives way less
        a.pushedBy = wa > 0.6 ? b.color : null;
        b.pushedBy = wb > 0.6 ? a.color : null;
      }
      a.x -= nx * sep * wa; a.y -= ny * sep * wa;
      b.x += nx * sep * wb; b.y += ny * sep * wb;
    }

    /* ---------------- extra bodies a league can drop in ----------------
       A prop is any round thing that is not a robot and not a pet: the person
       an assistive robot guides, an intruder, a resident walking around. The
       world keeps it out of walls and furniture and lets the sensors see it;
       WHERE it walks is entirely the league's business. */
    addProp(spec) {
      const p = Object.assign({ x: 0, y: 0, r: 0.2, heading: 0, solid: true, sensed: true, kind: 'prop' }, spec);
      p.hitWall = false;
      this.props.push(p);
      return p;
    }

    // keep a prop inside the house and out of the furniture; reports whether it
    // had to be pushed out of something (a league can charge for that)
    settleProp(p) {
      const x0 = p.x, y0 = p.y;
      this.resolveObstacles(p);
      this.resolveWalls(p);
      p.hitWall = Math.hypot(p.x - x0, p.y - y0) > 1e-4;
      return p.hitWall;
    }

    // a robot cannot push a pet around — it has to go around it
    resolveVsCritter(robot, c) {
      let dx = robot.x - c.x, dy = robot.y - c.y;
      let d = Math.hypot(dx, dy);
      const minD = robot.r + c.r;
      if (d >= minD) return;
      if (d < 1e-9) { dx = 1; dy = 0; d = 1; }
      robot.x = c.x + (dx / d) * minD;
      robot.y = c.y + (dy / d) * minD;
    }

    // the cat and the dog politely step around each other
    resolveCritterCritter(a, b) {
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      const minD = a.r + b.r;
      if (d >= minD) return;
      if (d < 1e-9) { dx = 1; dy = 0; d = 1; }
      const overlap = (minD - d) / 2, nx = dx / d, ny = dy / d;
      a.x -= nx * overlap; a.y -= ny * overlap;
      b.x += nx * overlap; b.y += ny * overlap;
      this.resolveObstacles(a); this.resolveWalls(a);
      this.resolveObstacles(b); this.resolveWalls(b);
    }

    // A pet walks about, turns away from walls and stops for a rest now and then.
    // Per-animal personality comes from optional fields on the object.
    updateCritter(c, dt) {
      c.t += dt;
      const blockedAhead = this.rayDist(c.x, c.y, c.heading, 1.5) < (c.avoidDist || 0.6);
      if (c.pause > 0) { c.pause -= dt; c.moving = false; }
      else if (c.escape > 0 || blockedAhead) {
        // blocked (or wedged): rotate toward the centre of the house until the
        // way is clear — the centre is always open, so this frees it eventually
        c.escape = Math.max(0, c.escape - dt);
        const toCenter = Math.atan2(this.cfg.H / 2 - c.y, this.cfg.W / 2 - c.x);
        let diff = toCenter - c.heading;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        if (Math.abs(diff) > 0.15) c.turnDir = diff >= 0 ? 1 : -1;   // else keep last direction
        c.heading += c.turnDir * (c.turnRate || 2.2) * dt;
        c.moving = false;
      } else {
        c.heading += Math.sin(c.t * (c.wanderFreq || 0.7)) * (c.wanderAmp || 0.35) * dt;
        c.x += Math.cos(c.heading) * c.speed * dt;
        c.y += Math.sin(c.heading) * c.speed * dt;
        c.moving = true;
        if (c.t > c.nextRest) { c.nextRest = c.t + (c.restEvery || 9); c.pause = (c.restLen || 2.0); }
      }
      this.resolveObstacles(c);
      this.resolveWalls(c);
      // a pet walks AROUND a person (or a fire, or an appliance) — never through
      for (const p of this.props) {
        if (!p.solid) continue;
        let dx = c.x - p.x, dy = c.y - p.y;
        let d = Math.hypot(dx, dy);
        const minD = c.r + p.r;
        if (d >= minD) continue;
        if (d < 1e-9) { dx = 1; dy = 0; d = 1; }
        c.x = p.x + (dx / d) * minD;
        c.y = p.y + (dy / d) * minD;
      }
      // no-progress watchdog: "walking" but pinned on a corner -> forced escape turn
      if (c.moving) {
        if (Math.hypot(c.x - c.refX, c.y - c.refY) > 0.25) { c.refX = c.x; c.refY = c.y; c.stuckT = 0; }
        else if ((c.stuckT += dt) > 1.5) { c.escape = 1.2; c.stuckT = 0; }
      } else if (c.escape <= 0) { c.refX = c.x; c.refY = c.y; c.stuckT = 0; }
    }

    // One physics tick for every body in the house: drive, walk the pets, then
    // push everything apart again. `speedMul(robot)` lets a league slow a robot
    // down (a flat battery, a damaged wheel, ...). Sets `bumpedSince` on any
    // robot a collision had to correct — that is what the bumper reports.
    stepBodies(dt, speedMul) {
      this.stepDoors(dt, this.teams.map((k) => this.robots[k]));
      const rs = this.teams.map((k) => this.robots[k]);
      // where each robot stood before its wheels turned — the motor-load sensor
      // compares what the wheels ASKED for with what actually happened
      const pre = rs.map((rb) => ({ x: rb.x, y: rb.y }));
      for (const rb of rs) this.integrate(rb, dt, speedMul ? speedMul(rb) : 1);

      for (const cr of this.critters) if (cr.enabled !== false) this.updateCritter(cr, dt);
      if (this.cat.enabled !== false && this.dog.enabled !== false) this.resolveCritterCritter(this.cat, this.dog);

      // remember where the wheels wanted to go, so that any correction made by
      // a collision below counts as the BUMPER being pressed
      const before = rs.map((rb) => ({ x: rb.x, y: rb.y }));

      for (const rb of rs) { this.resolveObstacles(rb); this.resolveWalls(rb); }
      for (let a = 0; a < rs.length; a++)
        for (let b = a + 1; b < rs.length; b++) this.resolveBodies(rs[a], rs[b]);
      for (const cr of this.critters)
        if (cr.enabled !== false) for (const rb of rs) this.resolveVsCritter(rb, cr);
      // props stay where the league put them; a robot has to drive AROUND them.
      // Your OWN person is the exception: the rangefinders already hide them (a
      // robot knows the hand on its handle), so letting their nudge press the
      // bumper would make the robot feel a wall it cannot see — and the natural
      // reaction, reversing, drives it straight back into them. They still
      // collide; the touch just is not reported as a bump.
      const mine = [];
      for (const p of this.props) {
        if (!p.solid) continue;
        this.settleProp(p);
        const owner = (p.kind === 'person' && p.team) ? p.team : null;
        for (const rb of rs) {
          // the RIVAL's person is a normal obstacle — you can see them, so
          // feeling them is fair. Only your own is deferred.
          if (owner && rb.color === owner) { mine.push([rb, p]); continue; }
          this.resolveVsCritter(rb, p);
        }
      }
      for (const rb of rs) this.resolveWalls(rb);

      rs.forEach((rb, k) => {
        const cx = rb.x - before[k].x, cy = rb.y - before[k].y;
        if (Math.hypot(cx, cy) <= 1e-4) return;
        rb.bumpedSince = true;
        // WHICH HALF of the ring was pressed. The correction pushed us AWAY
        // from whatever we hit, so the thing itself lies the other way; turn
        // that into the robot's own frame and the front half is |angle| <= 90.
        let a = Math.atan2(-cy, -cx) - rb.heading;
        while (a > Math.PI) a -= 2 * Math.PI;
        while (a < -Math.PI) a += 2 * Math.PI;
        if (Math.abs(a) <= Math.PI / 2) rb.bumpedFrontSince = true;
        else rb.bumpedBackSince = true;
      });
      // now the person on your own handle: they still cannot be driven through,
      // but their nudge lands after the bumper has been decided
      for (const [rb, p] of mine) this.resolveVsCritter(rb, p);
      for (const rb of rs) this.resolveWalls(rb);

      rs.forEach((rb, k) => {
        // motor load: wheels commanding forward motion that never happened.
        // 0 rolling free · ~100 pinned against a wall or a rival.
        const drive = Math.abs(rb.left + rb.right) / 2;
        const expect = drive * this.cfg.maxSpeed * dt;
        const moved = Math.hypot(rb.x - pre[k].x, rb.y - pre[k].y);
        rb.load = expect > 1e-6 ? Math.round(100 * drive * Math.max(0, 1 - moved / expect)) : 0;
      });
    }

    /* ---------------- floor work ---------------- */

    // Which tiles did this robot's body just sweep that it does not already own?
    // Returns [{ i, j, prev }] — the league decides what that is worth. A real
    // vacuum cleans with its whole body, so a tile furniture only PARTLY covers
    // counts as soon as the robot rolls over any open floor left on it.
    sweep(robot) {
      const t = this.cfg.tile, out = [];
      const i0 = Math.floor(robot.x / t), j0 = Math.floor(robot.y / t);
      const take = (i, j) => {
        if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) return;
        const cur = this.owner[i][j];
        if (cur === 'blocked' || cur === robot.color) return;
        if (this.terrain[i][j] !== 0) return;    // rug and wet floor cannot be cleaned
        out.push({ i, j, prev: cur });
      };
      take(i0, j0);
      const r2 = robot.r * robot.r;
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          if (di === 0 && dj === 0) continue;
          const a = i0 + di, b = j0 + dj;
          if (a < 0 || b < 0 || a >= this.cols || b >= this.rows) continue;
          const pts = this.free[a][b];
          if (!pts) continue;                    // fully open tiles keep the old rule
          for (let k = 0; k < pts.length; k++) {
            const dx = pts[k].x - robot.x, dy = pts[k].y - robot.y;
            if (dx * dx + dy * dy <= r2) { take(a, b); break; }
          }
        }
      }
      return out;
    }

    // Fires once each time a body rolls onto a NEW tile (wet floor, traps, ...).
    // `keyProp` keeps separate counters for separate rules on the same body.
    tileEntry(body, keyProp) {
      const prop = keyProp || 'lastTileKey';
      const cell = this.tileOf(body.x, body.y);
      if (!cell) return null;
      const key = cell.i * 1000 + cell.j;
      if (key === body[prop]) return null;
      body[prop] = key;
      return cell;
    }

    // Move a body to a random free spot (the league adds whatever penalty it likes)
    teleport(body) {
      const p = this.randomFreePos();
      body.x = p.x; body.y = p.y; body.heading = this.rand() * Math.PI * 2;
      body.left = 0; body.right = 0;
      // ...and if the landing still grazes something, nudge straight out of
      // it instead of leaving the shell wedged
      this.resolveObstacles(body);
      this.resolveWalls(body);
      this.resetStuck(body);
      return p;
    }

    resetStuck(body) { body.stuckTimer = 0; body.stuckRef = { x: body.x, y: body.y }; }

    // "Stuck" also covers going in circles: no progress out of a small circle for
    // STUCK_SECONDS. Returns true the moment the watchdog fires (and rearms).
    updateStuck(body, dt) {
      if (Math.hypot(body.x - body.stuckRef.x, body.y - body.stuckRef.y) > STUCK_RADIUS) {
        this.resetStuck(body);
        return false;
      }
      body.stuckTimer += dt;
      if (body.stuckTimer < STUCK_SECONDS) return false;
      body.stuckTimer = 0;
      return true;
    }
  }

  const api = { World, DEFAULTS, RUG_SPEED, STUCK_SECONDS, STUCK_RADIUS, clamp };
  root.RobotWorld = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
