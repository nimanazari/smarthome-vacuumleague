/* ============================================================
   tools/replay-match.js — play a whole match HEADLESS and save it as a
   replay: the same snapshots the live ARENA streams (robots, pets, doors,
   tile ownership, scores, clock), 5 a second, in one JSON file the site
   plays back on a loop at /replay.

     node tools/replay-match.js [--map map1|STANDARD|...] [--league u14]
                                [--red bots/wallfollow.py] [--blue bots/hunter.py]
                                [--seconds 180] [--seed 42] [--out replay.json]

   Loads the game's own scripts (physics, engine, PyReader, the league
   files) into Node — no browser, no rendering — so the match is exactly
   the one the game would play with these programs, this map and this seed.

   فارسی: یک مسابقه‌ی کامل را بدون مرورگر اجرا می‌کند و به‌صورت ریپلی
   (همان اسنپ‌شات‌های پخش زنده) ذخیره می‌کند تا سایت روی تکرار پخشش کند.
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1]] : null).filter(Boolean));
const LEAGUE = args.league || 'u14';
const MAPNAME = args.map || 'map1';
const SECONDS = +(args.seconds || 180);
const SEED = +(args.seed || Math.floor(Math.random() * 1e9));
const RED = args.red || 'leagues/vacuum/bots/wallfollow.py';
const BLUE = args.blue || 'leagues/vacuum/bots/hunter.py';
const OUT = args.out || path.join(ROOT, 'organizer-only', 'replays', 'replay.json');

// ---- a browser-shaped global, just enough for the game's plain scripts ----
const win = global;
win.window = win; win.self = win; win.globalThis = win;
win.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
win.document = { write: () => {}, createElement: () => ({ style: {}, getContext: () => null }), getElementById: () => null, querySelector: () => null, addEventListener: () => {}, body: { classList: { add() {}, remove() {}, contains() { return false; } } } };
win.performance = win.performance || { now: () => Date.now() };
win.requestAnimationFrame = () => 0;
try { Object.defineProperty(win, 'navigator', { value: { language: 'en' }, configurable: true }); } catch (e) { /* node has its own */ }
const load = (rel) => { const p = path.join(ROOT, rel); vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: rel }); };
for (const f of ['sensors.js', 'physics.js', 'robot-battery.js', 'leagues.js', 'leagues/manifest.js']) load(f);
for (const L of win.LEAGUE_MANIFEST) {
  for (const x of (L.pre || [])) load('leagues/' + L.id + '/' + x);
  try { load('leagues/' + L.id + '/robot.js'); } catch (e) { /* 3D only */ }
  load('leagues/' + L.id + '/league.js');
  for (const e of (L.extra || [])) load('leagues/' + L.id + '/' + e);
  for (const d of L.divisions) load('leagues/' + L.id + '/' + d + '/rules.js');
}
load('engine.js'); load('pyreader.js');

// ---- the game's own controller factory, lifted verbatim from index.html ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').split(/\r?\n/);
const a = html.findIndex((l) => l.startsWith('    function makeController(source, tag) {'));
let b = a + 1; while (b < html.length && html[b] !== '    }') b++;
// the page's names the factory touches: the match (`engine`), its log
// (`matchLog`, off here), the division (`leagueDef`) and a few UI helpers
const factorySrc = 'const sensVars = {}, sensSrc = {}; const matchLog = null; const leagueDef = () => win.Leagues.get(LEAGUE); '
  + 'const T = (fa, en) => en; const showToast = () => {}; const $ = () => null;\n'
  + html.slice(a, b + 1).join('\n') + '\nmakeController;';
const makeController = vm.runInThisContext(factorySrc, { filename: 'index.html#makeController' });

// ---- the map ----
let map = null;
const mp = path.join(ROOT, 'organizer-only', 'maps', MAPNAME, 'map.json');
if (fs.existsSync(mp)) map = JSON.parse(fs.readFileSync(mp, 'utf8'));
else if (win.VacuumMaps && win.VacuumMaps[MAPNAME]) map = win.VacuumMaps[MAPNAME];
else if (MAPNAME !== 'default') throw new Error('unknown map ' + MAPNAME);
const def = win.Leagues.get(LEAGUE);
if (!def) throw new Error('unknown league ' + LEAGUE);
const kits = def.kit ? { red: def.kit, blue: def.kit } : null;

const redSrc = fs.readFileSync(path.join(ROOT, RED), 'utf8'), blueSrc = fs.readFileSync(path.join(ROOT, BLUE), 'utf8');
const engine = new win.Engine({ matchSeconds: SECONDS, seed: SEED, redName: args.redName || path.basename(RED, '.py'), blueName: args.blueName || path.basename(BLUE, '.py'),
  map, league: LEAGUE, kits, pets: !!(def.rules && def.rules.pets), players: 2 });
win.engine = engine;                 // the lifted factory reads the page's `engine`
win.LEAGUE = LEAGUE;
engine.redController = makeController(redSrc, 'red');
engine.blueController = makeController(blueSrc, 'blue');
engine.running = true;

// ---- the same snapshot the ARENA streams ----
function snap() {
  const rows = [];
  for (let i = 0; i < engine.cols; i++) { let r = ''; for (let j = 0; j < engine.rows; j++) { const o = engine.owner[i][j]; r += o === 'red' ? 'r' : o === 'blue' ? 'b' : o === 'blocked' ? 'x' : '.'; } rows.push(r); }
  const rb = (k) => { const r = engine.robots[k]; return r ? { x: +r.x.toFixed(3), y: +r.y.toFixed(3), h: +r.heading.toFixed(3) } : null; };
  const pet = (p) => (p && p.enabled !== false) ? { x: +p.x.toFixed(3), y: +p.y.toFixed(3), h: +(p.heading || 0).toFixed(3) } : null;
  return { left: +Math.max(0, engine.cfg.matchSeconds - engine.elapsed).toFixed(2), scores: { red: engine.scores.red, blue: engine.scores.blue },
    robots: { red: rb('red'), blue: rb('blue') }, cat: pet(engine.cat), dog: pet(engine.dog),
    doors: (engine.doors || []).map((d) => +d.anim.toFixed(2)), owner: rows.join('|'), finished: !!engine.finished, running: !!engine.running };
}
const DT = 1 / 60, EVERY = 0.2;
const frames = [];
let acc = 0;
frames.push(snap());
while (!engine.finished && engine.elapsed < SECONDS + 60) {
  engine.step(DT); acc += DT;
  if (acc >= EVERY - 1e-9) { acc = 0; frames.push(snap()); }
}
frames.push(snap());
const out = {
  v: 1, kind: 'shl-replay', interval: EVERY, seconds: SECONDS, seed: SEED, league: LEAGUE, division: LEAGUE,
  homeName: engine.cfg.redName, awayName: engine.cfg.blueName, mapName: map ? map.name : 'default house', map: map || null,
  result: { home: engine.scores.red, away: engine.scores.blue, winner: engine.winner }, recordedAt: new Date().toISOString(), frames,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('replay: %s vs %s on %s — %d-%d (%s), %d frames, %.1f MB -> %s',
  out.homeName, out.awayName, out.mapName, out.result.home, out.result.away, out.result.winner, frames.length, fs.statSync(OUT).size / 1e6, path.relative(ROOT, OUT));
