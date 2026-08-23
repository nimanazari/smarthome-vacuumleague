/* ============================================================
   tools/validate-map.js — headless map QA.

   node tools/validate-map.js [mapName]

   Builds the same inflated occupancy grid the Route helper plans on
   (walls + furniture + the robot's radius) and answers the question
   a rulebook must be able to answer: CAN A ROBOT ACTUALLY REACH
   EVERY ROOM? It flood-fills from the red spawn and reports, per
   declared room, whether its floor is reachable — plus any free
   floor that is walled off from the spawn.

   فارسی: اعتبارسنج نقشه — از نقطه‌ی شروع ربات سیل می‌گیرد و
   می‌گوید هر اتاق واقعاً قابل رسیدن هست یا نه.
   ============================================================ */
'use strict';
global.self = global;
require('../leagues/vacuum/maps/house.js');
require('../leagues/vacuum/maps/rooms.js');
require('../leagues/vacuum/maps/grown.js');
require('../leagues/vacuum/maps/grown-rooms.js');
require('../leagues/vacuum/maps/open.js');
require('../leagues/vacuum/maps/standard.js');

const NAME = process.argv[2] || 'GROWN_ROOMS';
const MAP = global.VacuumMaps[NAME];
if (!MAP) { console.error('unknown map', NAME, '- have:', Object.keys(global.VacuumMaps).join(', ')); process.exit(2); }

const W = MAP.cols * MAP.tileSize, H = MAP.rows * MAP.tileSize;
const RES = 0.15625;                 // a quarter tile
const INFLATE = 0.30;                // robot radius 0.24 + margin
const NX = Math.round(W / RES), NY = Math.round(H / RES);

const rects = [];
(MAP.walls || []).forEach((w) => rects.push([w.x - w.w / 2, w.y - w.d / 2, w.x + w.w / 2, w.y + w.d / 2]));
(MAP.objects || []).forEach((o) => {
  if (o.t === 'dock' || o.t === 'dump' || o.t === 'door' || o.t === 'sconce') return;   // pass-through: doors push open, sconces hang high
  const r = (o.rot || 0) % 2;
  const w = r ? o.d : o.w, d = r ? o.w : o.d;
  rects.push([o.x - w / 2, o.y - d / 2, o.x + w / 2, o.y + d / 2]);
});
const free = (i, j) => {
  if (i < 0 || j < 0 || i >= NX || j >= NY) return false;
  const x = (i + 0.5) * RES, y = (j + 0.5) * RES;
  if (x < INFLATE || y < INFLATE || x > W - INFLATE || y > H - INFLATE) return false;
  for (const r of rects) if (x > r[0] - INFLATE && x < r[2] + INFLATE && y > r[1] - INFLATE && y < r[3] + INFLATE) return false;
  return true;
};
const cell = (x, y) => [Math.floor(x / RES), Math.floor(y / RES)];

// flood from the red spawn (snapped to the nearest free cell)
const spawn = (MAP.spawns && MAP.spawns.red) || { x: W / 2, y: H / 2 };
let start = cell(spawn.x, spawn.y);
outer: for (let r = 0; r < 40 && !free(start[0], start[1]); r++) {
  for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
    if (free(start[0] + di, start[1] + dj)) { start = [start[0] + di, start[1] + dj]; break outer; }
  }
}
const seen = new Uint8Array(NX * NY);
const q = [start];
seen[start[0] * NY + start[1]] = 1;
while (q.length) {
  const [i, j] = q.pop();
  for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const a = i + di, b = j + dj;
    if (free(a, b) && !seen[a * NY + b]) { seen[a * NY + b] = 1; q.push([a, b]); }
  }
}

let fail = 0;
console.log('map:', MAP.name, '· grid', NX + 'x' + NY, '· inflate', INFLATE, 'm');

// per room: how much of its FREE floor is reachable
for (const rm of (MAP.rooms || [])) {
  let freeCells = 0, reach = 0;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const x = (i + 0.5) * RES, y = (j + 0.5) * RES;
    if (x < rm.x1 || x > rm.x2 || y < rm.y1 || y > rm.y2) continue;
    if (!free(i, j)) continue;
    freeCells++;
    if (seen[i * NY + j]) reach++;
  }
  const pct = freeCells ? Math.round(reach / freeCells * 100) : 0;
  const ok = pct >= 99;
  if (!ok) fail++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + 'room ' + rm.id + ' (' + rm.name + '): ' + pct + '% of its free floor reachable');
}
// whole-floor check
let totFree = 0, totReach = 0;
for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
  if (!free(i, j)) continue;
  totFree++;
  if (seen[i * NY + j]) totReach++;
}
const lost = totFree - totReach;
console.log('  floor: ' + totReach + '/' + totFree + ' free cells reachable' + (lost ? '  ← ' + lost + ' SEALED cells!' : ''));
if (lost > totFree * 0.005) fail++;
process.exit(fail ? 1 : 0);
