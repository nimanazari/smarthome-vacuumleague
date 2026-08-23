# `leagues/` — one folder per league

Every league is a folder. A folder holds everything that league *is*: its rules,
its house, its robot model, and one program per sub-league. Nothing outside the
folder mentions the league by name — except a single line in `manifest.js`.

That is the whole point: **copy a folder out, drop a folder in.**

```
leagues/
  manifest.js              the only shared list — which folders exist
  vacuum/                  ← a league
    league.js              the rule engine + the group card + the house map
    robot.js               this league's own 3D model (registers itself)
    README.md              what it is, how its divisions differ, how to copy it
    fs/
      rules.js             the FS sub-league: the switches that make it FS
      program.py           the program the editor loads for FS
    u14/  rules.js  program.py
    u19/  rules.js  program.py
    bots/*.py              ready-made brains the "pick a robot" menu offers
  assistive/   …same shape
  sumo/        …same shape
  fire/        …same shape
  energy/      …same shape
```

## How a folder is loaded

`index.html` and `mapmaker.html` never name a league. They read `manifest.js`
and, for each entry, load:

```
leagues/<id>/<pre>          →  optional: files league.js itself needs (maps!)
leagues/<id>/robot.js       →  registers its 3D model
leagues/<id>/league.js      →  registers the group, exports its shared pieces
leagues/<id>/<extra>        →  optional: this league's own data files, first
leagues/<id>/<div>/rules.js →  registers one sub-league
```

`pre: [...]` on a manifest entry loads before everything else in the folder —
it is how the vacuum league ships every house as its own file under `maps/`
(`root.VacuumMaps`), readable by league.js, the divisions, the helper and the
map maker alike.

`extra: ['fs/kit.js']` on a manifest entry names files inside that league's own
folder which must be loaded before its divisions. It is how a league ships plain
data that more than one of its files needs — and that a page of its own, like a
helper, can load on its own too — without either of them duplicating it.

## Adding a league

1. Copy any existing folder and rename it.
2. Change the ids inside (`registerGroup({ id: … })`, each division's `id`), and
   the export name at the bottom of `league.js` (`root.XxxLeague = api`).
3. Add one line to `manifest.js`:
   ```js
   { id: 'yourleague', divisions: ['fs', 'u14', 'u19'] },
   ```

Nothing else in the codebase changes.

## Taking a league somewhere else

Copy the folder, plus the shared core it runs on:

```
physics.js  engine.js  leagues.js  sensors.js  pyreader.js
robot-parts.js  robot-battery.js  homeobjects.js  render.js  vendor/three.min.js
```

Then load the folder in the order above. A league never imports another league,
so nothing else comes along.

## What a league may change, and where

| Want to change | Edit | Reaches |
|---|---|---|
| the house / the arena | `map:` (or `arena:`) in `league.js` | this league only |
| physics numbers (speed, sensor range, robot radius…) | `world:` in `league.js` | this league only |
| the robot's look | `robot.js` | this league only |
| the suggested sensor kit | `kit:` in `league.js` | this league only |
| a rule, the clock, a penalty | `rules:` / `defaults:` in `<div>/rules.js` | that sub-league only |
| the starter program | `<div>/program.py` | that sub-league only |
| match logic | the rule-set class in `league.js` | this league only |

The shared files under `game/` are **not** the place to make a league-specific
change. If you find yourself editing `physics.js` to make one league behave
differently, use `world:` instead. See `MODULARITY.md` at the project root.
