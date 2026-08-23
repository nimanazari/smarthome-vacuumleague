# Smart Home Vacuum League — standalone

A cleaning race. Two robots share one house; every floor tile a robot drives over
turns that robot's colour and is worth one point. Last touch wins a tile, so
driving over the rival's tiles steals them back.

This folder is **the whole league**. It knows nothing about any other league and
nothing about the smarthomeleague.ir site — copy it anywhere and it runs.

**The rulebook is [`RULES.md`](RULES.md)** (Persian) — every number in it is read
straight off the code in this folder: scoring, penalties, overtime, the battery,
the dust bin, the referee's settings and the sensor list per division.
**[`CODING.md`](CODING.md)** is the companion guide for the teams: how the Python
runs, every sensor and wheel command, which parts each division may fit, and
three complete worked programs. Every example in it compiles and has been run.

## Run it

Double-click `serve.bat` (needs Python), or from a terminal here:

    python -m http.server 8801

then open <http://localhost:8801/>.

The front door is the **age divisions** (FS / U14 / U19). There is only one
league in this folder, so the old "choose your league" step is skipped — drop a
second league into `leagues/manifest.js` and the picker comes back by itself
(`ONE_LEAGUE` in `index.html`).

It **must** be served over HTTP. Opening `index.html` straight off the disk
(`file://`) fails: the browser will not let the page fetch the `.py` programs.

## What is in here

    index.html          the game
    leagues/
      manifest.js       one line: this league exists
      vacuum/
        mapmaker.html   THIS LEAGUE'S map editor — the 🛠 button on the
        mapmaker.js     setup screen opens it (see "The map maker" below)
        maps/           ONE FILE PER HOUSE: house.js, rooms.js, grown.js,
                        grown-rooms.js (the official 22×22 rooms floor)
        league.js       the rule engine (VacuumMode), the group card
        robot.js        this league's 3D model
        README.md       the full league write-up
        helper/         the AI HELPER MODULE (?league=fs / ?league=u14)
        helper2/        the BLOCKS HELPER MODULE (Scratch-style, FS) —
                        same rules file as helper/, so they interconvert
        helper3/        the ROUTE HELPER MODULE (U19): waypoints on the real
                        map, A* doorway planning, the battery guard
        CURRICULUM.md   the 3x10-lesson plan, bilingual, with the code base
        fs/             First Step  (ages 8–11)
        u14/            U14         (ages 11–14)
        u19/            U19         (ages 14–19) — battery + charging pad
        bots/*.py       ready-made brains the "pick a robot" menu offers
    fsapp/              the older 🧩 block-coding app
    physics.js engine.js leagues.js sensors.js pyreader.js
    robot-parts.js robot-battery.js homeobjects.js render.js builder.js
    vendor/three.min.js

## The three sub-leagues

| | FS | U14 | U19 |
|---|---|---|---|
| ages | 8 – 11 | 11 – 14 | 14 – 19 |
| match length | 120 s | 180 s | 180 s |
| cat + dog | off | on | on |
| wet floor | off | −2 tiles per entry | −2 tiles per entry |
| relocate cost | 2 tiles | 5 tiles | 5 tiles |
| battery + pad | off | off | on |
| dust bin (1P only) | off | off | 30 tiles, then go empty |
| robot builder | off | on | on |
| how the program is written | the **AI helper page** | the helper (U14 mode) **or** the editor | the editor |

## Who has a helper? · کدام رده هلپر دارد؟

A division has the 🤖 AI button exactly when its `rules.js` declares a
`helper:` line — the button follows that line, nothing else.
هر رده‌ای که در `rules.js` خودش خط `helper:` داشته باشد، دکمه‌ی 🤖 AI
می‌گیرد — نه بیشتر، نه کمتر.

| division · رده | helper? | page · صفحه | what it offers · چه می‌دهد |
|---|---|---|---|
| Vacuum **FS** | ✅ ×2 | `helper/helper.html?league=fs` **and** `helper2/blocks.html?league=fs` | 🤖 AI: sensors → rules → Python · 🧩 Blocks: Scratch-style stacks, SAME rules file, exports .py + .blocks.json · دو هلپر با یک فایل قانون مشترک |
| Vacuum **U14** | ✅ | `leagues/vacuum/helper/helper.html?league=u14` | everything FS has **+ compass (`heading`), room number (`room`), clean-% (`clean1..3`), Turn-to-° and 3-move exit plans** · همه‌ی FS + قطب‌نما، شماره‌ی اتاق، درصد تمیزی و پلان سه‌حرکتی خروج از اتاق |
| Vacuum **U19** | ✅ | `helper3/route.html?league=u19` | 📍 Route: tap the map, drop waypoints — A*-planned doorway via-points, goto() chains, and a battery guard with pre-planned safe paths to the charging pad · نقشه را لمس کن، نقطه بگذار؛ عبور از درها و مسیر شارژ را خودش plan می‌کند |

The helper is **its own module** — `leagues/vacuum/helper/` (html + js + css),
declared per-division, shared by FS and U14, saved separately per division
(`shl_helper_fs_rules` / `shl_helper_u14_rules`), with a ☀️/🌙 light–dark
toggle. هلپر یک ماژول مستقل است: هر رده جدا اعلامش می‌کند و قانون‌های هر
رده جدا ذخیره می‌شود؛ حالت روشن/تاریک هم دارد.

## The FS app

`leagues/vacuum/helper/helper.html` — a page of its own. An 8-year-old taps a sensor
on the robot diagram, answers *"this eye just saw something, which way do I go?"*,
and the page writes a real Python file the match runs. The 🤖 **AI** button on
the setup screen opens it; FS and U14 both declare it.

The code panel doubles as the **bridge to U14**: the numbers a rule owns are
yellow and editable right in the Python — click one, type, and the rule and the
little room follow. When the page feels small, the box under the panel points at
the U14 editor, where the same if/elif chain is typed by hand.

## Learning from a match

* **Live code trace** — with Sensors on, each robot's window prints which
  `if` / `elif` line of the team's own file is driving *right now*
  (`▶ 187: elif front < 75:`). The trace is recorded by `pyreader.js`.
* **Match report** — the results card's **📊 گزارش مسابقه** button opens a
  debrief: a heatmap of where each robot spent its time (✖ marks the referee's
  relocations), score over time, stats (coverage, distance, time stuck,
  penalties, battery), and one auto-coaching tip per team in Persian.
* **Technical Challenge** — the 🏆 button on the setup screen opens a ladder of
  five single-skill missions (escape the corner, skip the purple rug, home
  before dark…), each a solo run with its own map, clock and pass line. Passes
  and best times are remembered per browser. Declared as `tech:` in
  `leagues/vacuum/league.js`; the game page knows no mission by name.
* **Bilingual starters** — every `program.py` explains itself in Persian and
  English, comment for comment. The code itself is unchanged.
* **Per-division tutorials** — the 🎓 button teaches each division its own
  senses on its own map: 6 lessons for FS, 6 for U14 (compass, corners), 5 for
  U19 (battery, dock, budget, state machine, bin). Persian-first, live-run.
* **Champion reference code** — `bots/champ_fs.py` / `champ_u14.py` /
  `champ_u19.py`: one COMPLETE measured program per division, top of the bots
  menu. Every claim in their comments was benchmarked before it was written.
* **In-game rules 📖** — each division declares its own `guide:` in its
  rules.js; the قوانین button renders it (goal, clock, penalties, specifics,
  and a "where do I start" learning path).
* **The league book 🏆** — every real match is recorded to `shl_results` the
  moment it ends (teams, division, map, score, overtime, relocations, date).
  The امتیازات button shows standings (win 3 / draw 1) + history and exports
  CSV. `CHANGELOG.md` is the dated log of all of this; `ROADMAP.md` is what
  a full competition league still needs, with code-level evidence.

## The map maker

This league owns its editor: `leagues/vacuum/mapmaker.html` (+ `mapmaker.js`).
It sits **inside the league folder**, next to `league.js`, so the folder really
is the whole league — copy the folder and the editor comes with it.

The game page never names it. The group card in `league.js` declares

    mapmaker: 'leagues/vacuum/mapmaker.html',

and the 🛠 and ✏️ buttons on the setup screen open whatever is named there; a
league that declares nothing simply shows no buttons. The page carries
`<base href="../../">`, which is what lets every path inside it (`vendor/`,
`leagues/`, `fonts/`, `index.html`) read exactly as it did from the root.

A map you build here is tagged `vacuum` by default (`OWNER_LEAGUE` in
`mapmaker.js`) and saves itself into this browser's localStorage.

### نقشه‌های من — build one, name it, keep it

The **first panel of the toolbox** is where a map is created and kept:

* **نقشه‌ی نو بساز** asks for a name and puts the empty house on the shelf at
  once — nothing you build after that can be lost.
* **ذخیره** stores the open map under the name in the box. Change the name and
  press it again and that is a *rename*, not a second copy.
* **ذخیره‌ی کپی** forks the map under a new name and carries on editing the copy.
* The list underneath opens (✏️ renames, 🗑 deletes) every map you ever saved.
  The open one is marked ●.

After the first save the map keeps saving itself on every edit — the line under
the buttons, and the chip in the header, always say where your work stands.
Maps live under `shl_maps` in localStorage, which is the same shelf the game's
map list reads, so a saved map is playable straight away and is still there the
next time this browser opens.

## The dust bin — U19, one player only

A real robot cannot clean a whole house on one bin-load, so in a **single-player
U19 match** the bin holds **30 tiles**. Fill it and the robot cleans *nothing* —
it still drives, the floor just stays dirty and the score stops — until it
reaches the **emptying station**, a machine of its own that stands nowhere near
the charging pad. Two errands, two trips, three minutes.

Head to head nothing changes: the bin never fills and reaching the station once
is worth +5, exactly as before.

The rule lives in `VacuumMode` (`dumpEvery`, `_claim`) and is switched on by
`rules: { dump: true, dumpEvery: 30 }` in `leagues/vacuum/u19/rules.js`. The
station is a Map-Maker object (`t: 'dump'`, "ایستگاه تخلیه" in the toolbox), so
a house without one simply plays the old way. The robot's code reads `dust`,
`dustmax`, `dustfull` and `dumpx` / `dumpy`.

## Scoring

Scoring is this league's own, in `VacuumMode` inside `league.js`: one point per
tile owned, stolen back on last touch, minus the relocate and wet-floor
penalties. The scoreboard reads `scores`, `hud()` and `result()`.

## Changing things

| to change | edit |
|---|---|
| the house | `HOUSE` in `leagues/vacuum/league.js` |
| physics numbers | `world:` in `league.js` |
| the robot's look | `leagues/vacuum/robot.js` |
| a rule, the clock, a penalty | `leagues/vacuum/<div>/rules.js` |
| a starter program | `leagues/vacuum/<div>/program.py` |
| the FS sensor rig | `leagues/vacuum/fs/kit.js` (the helper page reads the same file) |

Never edit a shared file for a league-specific preference — every channel is
inside `leagues/vacuum/`.
