/* ============================================================
   leagues/vacuum/helper3/route.js — the Route helper (helper 3, U19).

   POSITION IS THE LESSON. The child taps the real house map and
   drops numbered waypoints; the Python this page writes drives them
   point-to-point with goto(x, y) + atgoal, and a battery guard that
   sends the robot to the charging pad (dockx, docky) below a LOW
   threshold, holds it there until FULL, then resumes the route.
   The route is saved per league; the only thing handed to the game
   is a real Python file (the same ?helpercode=1 contract).

   فارسی: نقشه را لمس کن، نقطه بگذار — ربات نقطه‌به‌نقطه با goto
   می‌رود و باتری که کم شد خودش می‌رود شارژر، پر می‌کند و برمی‌گردد.
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const LEAGUE = Q.get('league') || 'u19';
  const SAVE_KEY = 'shl_route_' + LEAGUE;
  const HANDOFF_KEY = 'shl_helper_code';
  const GAME_URL = '../../../index.html';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // U19 plays the big rooms house; its dock is a map OBJECT.
  // A ★-stamped default (set in the Map Maker) wins over the shipped one.
  const MAP = (() => {
    try {
      const j = JSON.parse(localStorage.getItem('shl_defmap_' + LEAGUE) || 'null');
      if (j && j.cols) return j;
    } catch (e) { /* private mode */ }
    return (self.VacuumMaps && (self.VacuumMaps.GROWN_ROOMS || self.VacuumMaps.ROOMS)) || null;
  })();
  const W = MAP ? MAP.cols * MAP.tileSize : 13.75;
  const H = MAP ? MAP.rows * MAP.tileSize : 13.75;
  const DOCK = MAP ? (MAP.objects.filter((o) => o.t === 'dock')[0] || null) : null;

  /* ---- the route ---- */
  let ROUTE = { wps: [], loop: true, low: 35, full: 90, batt: true, stay: 'pct', staySecs: 5 };
  try {
    const j = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (j && Array.isArray(j.wps)) ROUTE = Object.assign(ROUTE, j);
  } catch (e) { /* private mode */ }
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(ROUTE)); } catch (e) { /* private mode */ } };

  /* ================================================================
     THE PLANNER — goto() drives a straight line and does NOT dodge
     walls, so this page routes each leg itself: A* over the house
     grid (walls + furniture inflated by the robot's radius), then a
     line-of-sight smoothing pass. The child taps DESTINATIONS; the
     code gets the doorway via-points for free.
     فارسی: بچه فقط مقصد می‌گذارد؛ مسیرِ ردشدن از درها را خودِ
     صفحه حساب می‌کند و به کد می‌دهد.
     ================================================================ */
  const RES = 0.15625;                       // a quarter tile
  const INFLATE = 0.34;                      // robot radius + a margin
  const NXC = Math.round(W / RES), NYC = Math.round(H / RES);
  const BLOCKED = (() => {
    const g = new Uint8Array(NXC * NYC);
    const rects = [];
    (MAP.walls || []).forEach((wl) => rects.push([wl.x - wl.w / 2, wl.y - wl.d / 2, wl.x + wl.w / 2, wl.y + wl.d / 2]));
    (MAP.objects || []).forEach((o) => {
      if (o.t === 'dock' || o.t === 'dump' || o.t === 'door' || o.t === 'sconce') return;   // pass-through: doors push open, sconces hang high      // drive INTO these
      const rot = (o.rot || 0) % 2;
      const w = rot ? o.d : o.w, d = rot ? o.w : o.d;
      rects.push([o.x - w / 2, o.y - d / 2, o.x + w / 2, o.y + d / 2]);
    });
    for (let i = 0; i < NXC; i++) {
      for (let j = 0; j < NYC; j++) {
        const cxm = (i + 0.5) * RES, cym = (j + 0.5) * RES;
        let b = cxm < INFLATE || cym < INFLATE || cxm > W - INFLATE || cym > H - INFLATE;
        for (let k = 0; !b && k < rects.length; k++) {
          const r = rects[k];
          b = cxm > r[0] - INFLATE && cxm < r[2] + INFLATE && cym > r[1] - INFLATE && cym < r[3] + INFLATE;
        }
        if (b) g[i * NYC + j] = 1;
      }
    }
    return g;
  })();
  const cellOf = (x, y) => [clamp(Math.floor(x / RES), 0, NXC - 1), clamp(Math.floor(y / RES), 0, NYC - 1)];
  const isFree = (i, j) => i >= 0 && j >= 0 && i < NXC && j < NYC && !BLOCKED[i * NYC + j];
  // the nearest free cell — so a tap ON the sofa still means "beside the sofa"
  function nearestFree(x, y) {
    const [ci, cj] = cellOf(x, y);
    if (isFree(ci, cj)) return [x, y];
    for (let r = 1; r < 30; r++) {
      for (let di = -r; di <= r; di++) {
        for (let dj = -r; dj <= r; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          if (isFree(ci + di, cj + dj)) return [(ci + di + 0.5) * RES, (cj + dj + 0.5) * RES];
        }
      }
    }
    return [x, y];
  }
  function losFree(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.ceil(d / (RES / 2)));
    for (let k = 0; k <= n; k++) {
      const [i, j] = cellOf(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n);
      if (!isFree(i, j)) return false;
    }
    return true;
  }
  function astar(x1, y1, x2, y2) {
    const s0 = cellOf(x1, y1), t0 = cellOf(x2, y2);
    if (!isFree(s0[0], s0[1]) || !isFree(t0[0], t0[1])) return null;
    const key = (i, j) => i * NYC + j;
    const open = [[0, s0[0], s0[1]]];
    const gScore = new Map([[key(s0[0], s0[1]), 0]]);
    const came = new Map();
    const h = (i, j) => Math.hypot(i - t0[0], j - t0[1]);
    const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (open.length) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
      const [, ci, cj] = open.splice(bi, 1)[0];
      if (ci === t0[0] && cj === t0[1]) {
        const path = [[ci, cj]];
        let cur = key(ci, cj);
        while (came.has(cur)) { cur = came.get(cur); path.push([Math.floor(cur / NYC), cur % NYC]); }
        return path.reverse().map(([i, j]) => [(i + 0.5) * RES, (j + 0.5) * RES]);
      }
      const g0 = gScore.get(key(ci, cj));
      for (const [di, dj, c] of DIRS) {
        const ni = ci + di, nj = cj + dj;
        if (!isFree(ni, nj)) continue;
        if (di && dj && (!isFree(ci + di, cj) || !isFree(ci, cj + dj))) continue;   // no corner cutting
        const ng = g0 + c;
        const nk = key(ni, nj);
        if (gScore.has(nk) && gScore.get(nk) <= ng) continue;
        gScore.set(nk, ng);
        came.set(nk, key(ci, cj));
        open.push([ng + h(ni, nj), ni, nj]);
      }
    }
    return null;
  }
  function smooth(path) {
    if (!path || path.length < 3) return path || [];
    const out = [path[0]];
    let i = 0;
    while (i < path.length - 1) {
      let j = path.length - 1;
      while (j > i + 1 && !losFree(path[i][0], path[i][1], path[j][0], path[j][1])) j--;
      out.push(path[j]);
      i = j;
    }
    return out;
  }
  // every leg of the route, expanded with its doorway via-points.
  // Returns [{x, y, cm, target}] — target marks the child's own points.
  function expandRoute() {
    // snap every destination out of the walls' inflated margin first —
    // old saved points (or a tap right AT the sofa) would otherwise give
    // the planner a blocked start cell and silently lose the via-points
    const wps = ROUTE.wps.map((w) => {
      const [fx, fy] = nearestFree(w.x / 100, w.y / 100);
      return { x: fx, y: fy };
    });
    if (!wps.length) return [];
    const out = [{ x: wps[0].x, y: wps[0].y, target: 1, n: 1 }];
    const legs = [];
    for (let i = 0; i + 1 < wps.length; i++) legs.push([wps[i], wps[i + 1], i + 2]);
    if (ROUTE.loop && wps.length > 1) legs.push([wps[wps.length - 1], wps[0], 1]);
    for (const [a, b, n] of legs) {
      const p = smooth(astar(a.x, a.y, b.x, b.y));
      if (p && p.length > 2) {
        for (let k = 1; k < p.length - 1; k++) out.push({ x: p[k][0], y: p[k][1], target: 0 });
      }
      out.push({ x: b.x, y: b.y, target: 1, n });
    }
    if (ROUTE.loop && wps.length > 1) out.pop();          // the loop-back target IS point 1
    return out;
  }
  // for every MAIN node: its own pre-planned safe chain to the dock —
  // the battery guard drives THESE, never a straight line through a wall
  function chargePlans(pts) {
    if (!DOCK) return { chains: [], anchor: 0 };
    const [dx, dy] = nearestFree(DOCK.x, DOCK.y);
    let anchor = 0, best = 1e9;
    const chains = pts.map((w, i) => {
      const p = smooth(astar(w.x, w.y, dx, dy)) || [];
      const vias = p.length > 2 ? p.slice(1, -1).map(([x, y]) => ({ x, y })) : [];
      if (p.length && p.length < best) { best = p.length; anchor = i; }
      return vias;
    });
    return { chains, anchor };
  }

  /* ================================================================
     THE PYTHON — wp / charging are seeded by the game (like timer),
     so the file needs no setup block to run. atgoal is checked
     BEFORE goto() is called again: goto resets atgoal to 0.
     ================================================================ */
  const cmt = (code, note) => {
    if (!note) return code;
    const n = code.length >= 30 ? 1 : 31 - code.length;
    return code + new Array(n + 1).join(' ') + '# ' + note;
  };
  function toPython() {
    const L = [];
    const P = (s) => L.push(s == null ? '' : s);
    const BAR = '# ============================================================';
    const wps = ROUTE.wps;
    P('# type: ignore');
    P('# cspell:ignore wheelleft wheelright atgoal stopgoto distto dockx docky');
    P(BAR);
    P('#  MY ROUTE  -  built in the Route helper (U19)');
    P('#  ' + wps.length + ' waypoint' + (wps.length === 1 ? '' : 's') + (ROUTE.loop ? ', looping' : ', once') +
      (ROUTE.batt === false ? ' - battery guard OFF.'
        : ' - battery guard: below ' + ROUTE.low + '% go charge, ' +
          (ROUTE.stay === 'secs' ? 'sit ' + ROUTE.staySecs + ' s on the pad.' : 'resume at ' + ROUTE.full + '%.')));
    P('#  Doorway via-points are planned BY THE HELPER (goto drives straight');
    P('#  lines and cannot dodge walls) - the numbered points are mine.');
    P('#  wp / charging keep their value between steps (like timer).');
    P(BAR);
    P('');
    P('# === EDITOR SETUP =========================================');
    P('# The game SKIPS this block - it only calms the code editor.');
    P('battery = 100; dockx = 0; docky = 0; atgoal = 0');
    P('wp = 0; charging = 0; wheelleft = 0; wheelright = 0');
    P('# === END EDITOR SETUP =====================================');
    P('');
    if (!wps.length) {
      P('# No waypoint yet - tap the map in the Route helper.');
      P('wheelleft = 25');
      P('wheelright = 25');
      P('');
      return L.join('\n');
    }
    const pts = expandRoute();
    const CP = chargePlans(pts);
    // indices: 0..N-1 the route, then one charge chain per node, then DOCK
    const N = pts.length;
    const chainStart = [];
    let nextIdx = N;
    CP.chains.forEach((c) => { chainStart.push(nextIdx); nextIdx += c.length; });
    const DOCK_IDX = nextIdx;
    if (ROUTE.batt === false) {
      // no guard: the jump table never fires
      P(cmt('if battery < -1:', 'battery guard is OFF in the helper'));
      P('    charging = 1');
    } else
    P(cmt('if battery < ' + ROUTE.low + ' and charging == 0:', 'battery low - drop everything'));
    P(cmt('    charging = 1', 'jump onto MY safe path to the pad'));
    pts.forEach((w, i) => {
      const c = CP.chains[i];
      const first = c.length ? chainStart[i] : DOCK_IDX;
      const fx = c.length ? Math.round(c[0].x * 100) : 'dockx';
      const fy = c.length ? Math.round(c[0].y * 100) : 'docky';
      P('    ' + (i ? 'elif' : 'if') + ' wp == ' + i + ':');
      P('        wp = ' + first);
      P('        goto(' + fx + ', ' + fy + ')');
    });
    P('');
    pts.forEach((w, i) => {
      const last = i === pts.length - 1;
      const nxt = last ? (ROUTE.loop ? 0 : i + 1) : i + 1;
      const nw = pts[nxt];
      const label = w.target ? 'MY point ' + w.n : 'via a doorway';
      P(cmt('elif wp == ' + i + ':', label));
      P(cmt('    if atgoal == 1:', 'reached it?'));
      P(cmt('        wp = ' + nxt, last && !ROUTE.loop ? 'route done - hold' : 'next stop'));
      if (nw) {
        // start the next leg in the SAME step — goto() clears atgoal, so
        // the chain never spins through every point while standing still
        P('        goto(' + Math.round(nw.x * 100) + ', ' + Math.round(nw.y * 100) + ')');
      }
      P('    else:');
      P('        goto(' + Math.round(w.x * 100) + ', ' + Math.round(w.y * 100) + ')');
    });
    if (!ROUTE.loop) {
      P(cmt('elif wp == ' + pts.length + ':', 'route finished'));
      P(cmt('    wheelleft = 0', 'stand where the last point is'));
      P('    wheelright = 0');
    }
    // ---- the charge chains: pre-planned, one per route node ----
    CP.chains.forEach((c, i) => {
      c.forEach((v, k) => {
        const idx = chainStart[i] + k;
        const nIdx = (k + 1 < c.length) ? idx + 1 : DOCK_IDX;
        const nx = (k + 1 < c.length) ? Math.round(c[k + 1].x * 100) : 'dockx';
        const ny = (k + 1 < c.length) ? Math.round(c[k + 1].y * 100) : 'docky';
        P(cmt('elif wp == ' + idx + ':', 'to the pad, from point zone ' + i));
        P('    if atgoal == 1:');
        P('        wp = ' + nIdx);
        P('        goto(' + nx + ', ' + ny + ')');
        P('    else:');
        P('        goto(' + Math.round(v.x * 100) + ', ' + Math.round(v.y * 100) + ')');
      });
    });
    const A = CP.anchor;
    P(cmt('elif wp == ' + DOCK_IDX + ':', 'ON the pad - drink up'));
    P('    goto(dockx, docky)');
    if (ROUTE.stay === 'secs') {
      P(cmt('    if atgoal == 1:', 'count the seconds ON the pad'));
      P(cmt('        timer = timer + 1', '10 steps = one second'));
      P(cmt('    if timer > ' + (Math.round(ROUTE.staySecs * 10)) + ':', ROUTE.staySecs + ' s of charging done'));
      P('        timer = 0');
      P('        charging = 0');
      P(cmt('        wp = ' + A, 'at the node the pad can see'));
      P('        goto(' + Math.round(pts[A].x * 100) + ', ' + Math.round(pts[A].y * 100) + ')');
    } else {
      P(cmt('    if battery > ' + ROUTE.full + ':', 'full - rejoin the route'));
      P('        charging = 0');
      P(cmt('        wp = ' + A, 'at the node the pad can see'));
      P('        goto(' + Math.round(pts[A].x * 100) + ', ' + Math.round(pts[A].y * 100) + ')');
    }
    P('');
    return L.join('\n');
  }

  /* ================================================================
     THE MAP — the real house, from its modular file
     ================================================================ */
  const cv = $('mapCv'), cx = cv.getContext('2d');

  /* ================================================================
     THE PHOTO — the map is a real top-down render of the 3D house.
     An orthographic camera looks straight down, framed EXACTLY on
     the floor, so photo pixels and world metres line up 1:1 with
     the route maths. Falls back to the flat drawing if 3D fails.
     فارسی: نقشه، عکسِ واقعی از بالای خانه‌ی سه‌بعدی است.
     ================================================================ */
  let PHOTO = null;
  (function shootTopPhoto() {
    try {
      if (typeof THREE === 'undefined' || typeof Engine === 'undefined' || typeof Renderer3D === 'undefined') return;
      const hider = document.createElement('div');
      hider.style.cssText = 'position:fixed;left:-3000px;top:0;width:1024px;height:1024px';
      document.body.appendChild(hider);
      const eng = new Engine({ map: MAP, matchSeconds: 60, players: 2, seed: 1 });
      const r3 = new Renderer3D(hider);
      r3.buildScene(eng);
      r3.sync(eng);
      // straight-down ortho, framed on the floor: +x right, +y(world) up
      const camO = new THREE.OrthographicCamera(-W / 2 - 0.35, W / 2 + 0.35, H / 2 + 0.35, -H / 2 - 0.35, 0.1, 90);
      camO.position.set(0, 45, 0);
      camO.up.set(0, 0, 1);
      camO.lookAt(0, 0, 0);
      const px = 1100;
      r3.renderer.setSize(px, Math.round(px * (H + 0.7) / (W + 0.7)));
      r3.scene.fog = null;
      r3.renderer.render(r3.scene, camO);
      const url = r3.renderer.domElement.toDataURL('image/png');
      const img = new Image();
      img.onload = () => { PHOTO = img; draw(); };
      img.src = url;
      r3.renderer.dispose();
      hider.remove();
    } catch (e) { /* the flat map still works */ }
  })();
  const S = cv.width / Math.max(W, H);
  const X = (x) => x * S;
  const Y = (y) => cv.height - y * S;             // world y grows UP

  function draw() {
    cx.clearRect(0, 0, cv.width, cv.height);
    if (PHOTO) {
      // the real house, from straight above — the ortho frame includes a
      // 0.35 m apron on every side, so map it to the same world window
      const ax = 0.35 * S;
      cx.drawImage(PHOTO, X(0) - ax, Y(H) - ax, W * S + 2 * ax, H * S + 2 * ax);
    } else {
      cx.fillStyle = '#0f141d';
      cx.fillRect(0, 0, W * S, H * S);
    }
    // grid
    cx.strokeStyle = 'rgba(255,255,255,.05)'; cx.lineWidth = 1;
    const t = MAP.tileSize;
    for (let x = 0; x <= W + 1e-6; x += t) { cx.beginPath(); cx.moveTo(X(x), Y(0)); cx.lineTo(X(x), Y(H)); cx.stroke(); }
    for (let y = 0; y <= H + 1e-6; y += t) { cx.beginPath(); cx.moveTo(X(0), Y(y)); cx.lineTo(X(W), Y(y)); cx.stroke(); }
    if (PHOTO) { drawOverlaysOnPhoto(); return; }
    // rooms: tinted, labelled with their NUMBER — the numbers the code reads
    (MAP.rooms || []).forEach((r) => {
      cx.fillStyle = 'rgba(52,211,153,.07)';
      cx.fillRect(X(r.x1), Y(r.y2), (r.x2 - r.x1) * S, (r.y2 - r.y1) * S);
      cx.strokeStyle = 'rgba(52,211,153,.5)'; cx.setLineDash([6, 5]); cx.lineWidth = 1.5;
      cx.strokeRect(X(r.x1), Y(r.y2), (r.x2 - r.x1) * S, (r.y2 - r.y1) * S);
      cx.setLineDash([]);
      cx.fillStyle = 'rgba(52,211,153,.9)';
      cx.font = '700 13px Vazirmatn, Tahoma, sans-serif';
      cx.fillText('room ' + r.id + ' · ' + (r.name || ''), X(r.x1) + 6, Y(r.y2) + 17);
    });
    // rugs
    (MAP.rugs || []).forEach((g) => {
      cx.fillStyle = g.kind === 'wet' ? 'rgba(56,189,248,.35)' : (g.kind === 'purple' ? 'rgba(168,85,247,.3)' : 'rgba(34,197,94,.25)');
      cx.fillRect(X(g.x - g.w / 2), Y(g.y + g.d / 2), g.w * S, g.d * S);
    });
    // objects
    (MAP.objects || []).forEach((o) => {
      const rot = (o.rot || 0) % 2;
      const w = rot ? o.d : o.w, d = rot ? o.w : o.d;
      if (o.t === 'dock') {
        cx.fillStyle = 'rgba(34,197,94,.85)';
        cx.fillRect(X(o.x - w / 2), Y(o.y + d / 2), w * S, d * S);
        cx.fillStyle = '#04170c'; cx.font = '700 15px sans-serif';
        cx.fillText('🔌', X(o.x) - 8, Y(o.y) + 6);
        return;
      }
      cx.fillStyle = o.t === 'dump' ? 'rgba(245,158,11,.6)' : 'rgba(142,154,176,.4)';
      cx.fillRect(X(o.x - w / 2), Y(o.y + d / 2), w * S, d * S);
    });
    // walls
    cx.fillStyle = '#8ea0bf';
    (MAP.walls || []).forEach((wl) => cx.fillRect(X(wl.x - wl.w / 2), Y(wl.y + wl.d / 2), wl.w * S, wl.d * S));
    // the PLANNED route — the very polyline the Python will drive,
    // doorway via-points included; vias draw as small dots
    const pts = expandRoute();
    if (pts.length > 1) {
      cx.strokeStyle = 'rgba(245,158,11,.85)'; cx.lineWidth = 2.5;
      cx.beginPath();
      pts.forEach((w, i) => { const px = X(w.x), py = Y(w.y); if (i) cx.lineTo(px, py); else cx.moveTo(px, py); });
      if (ROUTE.loop && ROUTE.wps.length > 1) cx.lineTo(X(pts[0].x), Y(pts[0].y));
      cx.stroke();
    }
    pts.forEach((w) => {
      if (w.target) return;
      cx.beginPath(); cx.arc(X(w.x), Y(w.y), 4, 0, Math.PI * 2);
      cx.fillStyle = 'rgba(245,158,11,.9)'; cx.fill();
    });
    ROUTE.wps.forEach((w, i) => {
      const px = X(w.x / 100), py = Y(w.y / 100);
      cx.beginPath(); cx.arc(px, py, 13, 0, Math.PI * 2);
      cx.fillStyle = '#f59e0b'; cx.fill();
      cx.strokeStyle = '#1a1206'; cx.lineWidth = 2; cx.stroke();
      cx.fillStyle = '#1a1206'; cx.font = '800 13px Vazirmatn, Tahoma, sans-serif';
      cx.textAlign = 'center';
      cx.fillText(String(i + 1), px, py + 4.5);
      cx.textAlign = 'start';
    });
  }

  const evWorld = (e) => {
    const rc = cv.getBoundingClientRect();
    const mx = (e.clientX - rc.left) * (cv.width / rc.width);
    const my = (e.clientY - rc.top) * (cv.height / rc.height);
    return { mx, my, wx: mx / S, wy: (cv.height - my) / S };
  };
  // on the photo, the furniture is already IN the picture — only the
  // route knowledge is drawn on top of it
  function drawOverlaysOnPhoto() {
    (MAP.rooms || []).forEach((r) => {
      cx.strokeStyle = 'rgba(52,211,153,.65)'; cx.setLineDash([6, 5]); cx.lineWidth = 1.5;
      cx.strokeRect(X(r.x1), Y(r.y2), (r.x2 - r.x1) * S, (r.y2 - r.y1) * S);
      cx.setLineDash([]);
      cx.fillStyle = 'rgba(10,14,20,.55)';
      cx.fillRect(X(r.x1) + 3, Y(r.y2) + 4, 118, 16);
      cx.fillStyle = '#7defc0';
      cx.font = '700 11px Vazirmatn, Tahoma, sans-serif';
      cx.fillText('room ' + r.id + ' · ' + (r.name || ''), X(r.x1) + 7, Y(r.y2) + 16);
    });
    const pts = expandRoute();
    if (pts.length > 1) {
      cx.strokeStyle = 'rgba(245,158,11,.95)'; cx.lineWidth = 3;
      cx.shadowColor = 'rgba(0,0,0,.6)'; cx.shadowBlur = 4;
      cx.beginPath();
      pts.forEach((w, i) => { const px = X(w.x), py = Y(w.y); if (i) cx.lineTo(px, py); else cx.moveTo(px, py); });
      if (ROUTE.loop && ROUTE.wps.length > 1) cx.lineTo(X(pts[0].x), Y(pts[0].y));
      cx.stroke();
      cx.shadowBlur = 0;
    }
    pts.forEach((w) => {
      if (w.target) return;
      cx.beginPath(); cx.arc(X(w.x), Y(w.y), 4, 0, Math.PI * 2);
      cx.fillStyle = '#f59e0b'; cx.fill();
      cx.strokeStyle = '#1a1206'; cx.lineWidth = 1.5; cx.stroke();
    });
    ROUTE.wps.forEach((w, i) => {
      const px = X(w.x / 100), py = Y(w.y / 100);
      cx.beginPath(); cx.arc(px, py, 13, 0, Math.PI * 2);
      cx.fillStyle = '#f59e0b'; cx.fill();
      cx.strokeStyle = '#1a1206'; cx.lineWidth = 2; cx.stroke();
      cx.fillStyle = '#1a1206'; cx.font = '800 13px Vazirmatn, Tahoma, sans-serif';
      cx.textAlign = 'center';
      cx.fillText(String(i + 1), px, py + 4.5);
      cx.textAlign = 'start';
    });
  }

  cv.addEventListener('click', (e) => {
    if (drawJustEnded) { drawJustEnded = false; return; }   // a drag is not a tap
    const { mx, my, wx, wy } = evWorld(e);
    // tapping an existing badge removes that waypoint
    for (let i = 0; i < ROUTE.wps.length; i++) {
      const w = ROUTE.wps[i];
      if (Math.hypot(X(w.x / 100) - mx, Y(w.y / 100) - my) < 15) {
        ROUTE.wps.splice(i, 1); refresh(); return;
      }
    }
    if (wx < 0 || wx > W || wy < 0 || wy > H) return;
    const [fx, fy] = nearestFree(wx, wy);       // a tap ON the sofa means "beside it"
    ROUTE.wps.push({ x: Math.round(fx * 100), y: Math.round(fy * 100) });
    refresh();
  });

  /* ================================================================
     FREEHAND: hold ✏️ mode, DRAG on the map — the line you draw is
     sampled, simplified (Douglas-Peucker), snapped off furniture,
     and lands as waypoints. The robot drives YOUR line.
     فارسی: حالت کشیدن — موس را بکش، همان خط مسیر ربات می‌شود.
     ================================================================ */
  let drawMode = false, drawing = false, drawBuf = [], drawJustEnded = false;
  function rdp(pts, tol) {
    if (pts.length < 3) return pts.slice();
    let maxD = 0, idx = 0;
    const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
    const L = Math.hypot(bx - ax, by - ay) || 1e-9;
    for (let i = 1; i + 1 < pts.length; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD <= tol) return [pts[0], pts[pts.length - 1]];
    return rdp(pts.slice(0, idx + 1), tol).slice(0, -1).concat(rdp(pts.slice(idx), tol));
  }
  cv.addEventListener('pointerdown', (e) => {
    if (!drawMode) return;
    drawing = true; drawBuf = [];
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drawMode || !drawing) return;
    const { wx, wy } = evWorld(e);
    if (wx < 0 || wx > W || wy < 0 || wy > H) return;
    const last = drawBuf[drawBuf.length - 1];
    if (!last || Math.hypot(wx - last[0], wy - last[1]) > 0.3) {
      drawBuf.push([wx, wy]);
      // live preview: the raw stroke over the map
      draw();
      cx.strokeStyle = 'rgba(255,255,255,.75)'; cx.lineWidth = 2; cx.setLineDash([5, 5]);
      cx.beginPath();
      drawBuf.forEach((p, i) => { const px = X(p[0]), py = Y(p[1]); if (i) cx.lineTo(px, py); else cx.moveTo(px, py); });
      cx.stroke(); cx.setLineDash([]);
    }
  });
  cv.addEventListener('pointerup', () => {
    if (!drawMode || !drawing) return;
    drawing = false; drawJustEnded = true;
    if (drawBuf.length > 1) {
      const simple = rdp(drawBuf, 0.28);
      for (const [wx, wy] of simple) {
        const [fx, fy] = nearestFree(wx, wy);
        ROUTE.wps.push({ x: Math.round(fx * 100), y: Math.round(fy * 100) });
      }
    }
    drawBuf = [];
    refresh();
  });

  /* ================================================================
     THE LIST + WIRING
     ================================================================ */
  function numIn(val, set) {
    const i = document.createElement('input');
    i.type = 'text'; i.inputMode = 'numeric'; i.value = String(val);
    i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } };
    i.onchange = () => { const v = parseInt(i.value, 10); if (isFinite(v)) set(v); refresh(); };
    return i;
  }
  function drawList() {
    const box = $('wpList');
    box.innerHTML = '';
    if (!ROUTE.wps.length) {
      box.innerHTML = '<div class="wpempty">هنوز نقطه‌ای نگذاشته‌ای — روی نقشه بزن. مختصات به سانتی‌متر است؛ گوشه‌ی پایین-چپ (0,0) است.</div>';
      return;
    }
    ROUTE.wps.forEach((w, i) => {
      const row = document.createElement('div');
      row.className = 'wprow';
      const n = document.createElement('span'); n.className = 'n'; n.textContent = i + 1;
      row.appendChild(n);
      row.appendChild(document.createTextNode(' x'));
      row.appendChild(numIn(w.x, (v) => { w.x = clamp(v, 0, Math.round(W * 100)); }));
      row.appendChild(document.createTextNode(' y'));
      row.appendChild(numIn(w.y, (v) => { w.y = clamp(v, 0, Math.round(H * 100)); }));
      row.appendChild(document.createTextNode(' cm'));
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'x'; x.textContent = '×'; x.title = 'حذف این نقطه';
      x.onclick = () => { ROUTE.wps.splice(i, 1); refresh(); };
      row.appendChild(x);
      box.appendChild(row);
    });
  }

  function refresh() {
    ROUTE.loop = $('loopChk').checked;
    draw();
    drawList();
    $('code').textContent = toPython();
    $('barHint').textContent = ROUTE.wps.length + ' نقطه · ' + (ROUTE.loop ? 'حلقه' : 'یک‌بار') + ' · ' +
      (ROUTE.batt === false ? 'گارد باتری خاموش'
        : 'باتری: زیر ' + ROUTE.low + '٪ برو شارژر، ' +
          (ROUTE.stay === 'secs' ? ROUTE.staySecs + ' ثانیه بمان.' : 'تا ' + ROUTE.full + '٪ بمان.'));
    save();
  }
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.className = 'toast on';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.className = 'toast'; }, 2200);
  }

  // the ✏️ freehand toggle
  (function drawBtnInit() {
    const h2 = document.querySelector('.mapcard h2');
    if (!h2) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn ghost'; b.id = 'drawBtn';
    b.style.cssText = 'margin-inline-start:auto;padding:6px 12px;font-size:12.5px';
    const label = () => { b.innerHTML = drawMode ? '&#9999;&#65039; ' + '\u062D\u0627\u0644\u062A \u06A9\u0634\u06CC\u062F\u0646: \u0631\u0648\u0634\u0646' : '&#9999;&#65039; ' + '\u06A9\u0634\u06CC\u062F\u0646 \u0645\u0633\u06CC\u0631'; };
    label();
    b.onclick = () => { drawMode = !drawMode; cv.style.cursor = drawMode ? 'cell' : 'crosshair'; label(); };
    h2.appendChild(b);
  })();

  $('loopChk').checked = !!ROUTE.loop;
  $('loopChk').onchange = refresh;
  $('battChk').checked = ROUTE.batt !== false;
  $('battChk').onchange = () => {
    ROUTE.batt = $('battChk').checked;
    $('battRow1').style.opacity = $('battRow2').style.opacity = ROUTE.batt ? '' : '.35';
    refresh();
  };
  $('stayMode').value = ROUTE.stay || 'pct';
  $('stayMode').onchange = () => {
    ROUTE.stay = $('stayMode').value;
    $('stayPctWrap').style.display = ROUTE.stay === 'pct' ? '' : 'none';
    $('staySecWrap').style.display = ROUTE.stay === 'secs' ? '' : 'none';
    refresh();
  };
  $('stayPctWrap').style.display = (ROUTE.stay || 'pct') === 'pct' ? '' : 'none';
  $('staySecWrap').style.display = ROUTE.stay === 'secs' ? '' : 'none';
  $('staySecIn').value = ROUTE.staySecs || 5;
  $('staySecIn').onchange = () => { const v = parseInt($('staySecIn').value, 10); if (isFinite(v)) ROUTE.staySecs = Math.max(1, Math.min(60, v)); $('staySecIn').value = ROUTE.staySecs; refresh(); };
  $('lowIn').value = ROUTE.low;
  $('fullIn').value = ROUTE.full;
  $('lowIn').onchange = () => { const v = parseInt($('lowIn').value, 10); if (isFinite(v)) ROUTE.low = clamp(v, 5, 80); $('lowIn').value = ROUTE.low; refresh(); };
  $('fullIn').onchange = () => { const v = parseInt($('fullIn').value, 10); if (isFinite(v)) ROUTE.full = clamp(v, ROUTE.low + 10, 100); $('fullIn').value = ROUTE.full; refresh(); };
  $('resetBtn').onclick = () => { ROUTE.wps = []; refresh(); toast('مسیر پاک شد'); };
  $('copyBtn').onclick = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(toPython()).then(() => toast('کپی شد'), () => toast('کپی نشد'));
  };
  $('dlPyBtn').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([toPython()], { type: 'text/x-python' }));
    a.download = 'my-route.py';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  $('playBtn').onclick = () => {
    try { localStorage.setItem(HANDOFF_KEY, toPython()); }
    catch (e) { toast('مرورگر اجازه‌ی ذخیره نداد'); return; }
    location.href = GAME_URL + '?league=' + encodeURIComponent(LEAGUE) + '&helpercode=1';
  };
  $('playBtn2').onclick = () => {
    try { localStorage.setItem(HANDOFF_KEY + '_blue', toPython()); }
    catch (e) { toast('مرورگر اجازه‌ی ذخیره نداد'); return; }
    location.href = GAME_URL + '?league=' + encodeURIComponent(LEAGUE) + '&helpercode=1';
  };
  $('backLink').href = GAME_URL + '?league=' + encodeURIComponent(LEAGUE);
  $('mapHint').textContent = 'مختصات سانتی‌متری است: پایین-چپ (0,0)، بالا-راست (' +
    Math.round(W * 100) + ',' + Math.round(H * 100) + '). ناحیه‌های سبزِ شماره‌دار همان room هستند که کد U14/U19 می‌خواند.';

  /* ---- dark / light: the shared helper key ---- */
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

  /* ---- go ---- */
  refresh();
  // debug handle — nothing in the page reads it
  self._route = { expandRoute, astar, losFree, nearestFree, cellOf, isFree };
})();
