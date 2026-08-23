# Vacuum league

A cleaning race. Two robots share one house; every floor tile a robot drives over
turns that robot's colour and is worth one point. Last touch wins a tile, so
driving over the rival's tiles steals them back. The match ends on the clock, and
the side owning more tiles wins. A draw keeps playing: +10 s, then +5 s at a time.

Two things take tiles away again: the referee's relocate (a robot that has not
moved for the stuck timeout is teleported and loses `penalty` tiles) and wet floor
(rolling onto a wet tile costs 2 tiles — it fires once per *entry*, so crossing the
same puddle again costs again). In FINAL mode — a checkbox in the UI, not a
division setting — the cat also erases painted tiles it walks over.

The wet floor is two puddles in `HOUSE.rugs`, `kind: 'wet'`, tile-aligned and
mirrored about the centre of the house (tiles 9–10,13 and 5–6,2) so they sit the
same distance from each starting corner. They are what the `wet` rule punishes:
with no `kind: 'wet'` rug in the map, `physics.js` builds an empty `puddles` list
and the penalty can never fire at all. Wet tiles cannot be cleaned and are not
counted in the total, so U14/U19 play for 227 tiles and FS for 231.

## The three divisions

Read off `rules:` and `defaults:` in each `<division>/rules.js`. Everything else is
the same engine and the same house.

All three divisions play the **same big 22×22 ROOMS house**
(`vacuum-rooms-22`, one file per map under `maps/`) — a real family flat
with SIX zones and 2-tile doorways: the hall/living (room 0), the kitchen
(1), bedrooms 1/2/3 (2/3/4) and the bathroom (5). `room` and
`clean1..clean5` are live for everyone.
فارسی: شش ناحیه — هال ۰، آشپزخانه ۱، خواب‌ها ۲/۳/۴، سرویس بهداشتی ۵؛
`room` و `clean1..clean5` در هر سه رده زنده است.

| | FS | U14 | U19 |
|---|---|---|---|
| ages | 8 – 11 | 11 – 14 | 14 – 19 |
| match length | 120 s | 180 s | 180 s |
| cat + dog (`pets`) | off | on | on |
| wet floor (`wet`) | off — and the puddles are mopped out of the map too | on, −2 tiles per entry | on, −2 tiles per entry |
| cleanable tiles | 431 | 427 | 427 |
| relocate cost (`penalty`) | 2 tiles | 5 tiles | 5 tiles |
| battery + charging pad (`battery`) | off | off | on |
| starter program | `fs/program.py` (three eyes + both ring halves) | `u14/program.py` | `u19/program.py` (battery runner) |
| sensor rig (`kit`) | fixed: 3 forward eyes + the ring + colour (`fs/kit.js`) | the classic rig, team-built | the classic rig, team-built |
| robot builder | **off** (`builder: false`) — the only choice is the team colour, which paints the shell and the tiles | on | on |
| how the program is written | **two helpers**: 🤖 AI (`helper/`) and 🧩 Blocks (`helper2/`) | the AI helper (U14 mode) **or** the editor | the editor |

**FS has TWO helpers, one rules file.** The 🧩 Blocks page
(`helper2/blocks.html`) stacks Scratch-style blocks into if-rules; it reads
and writes THE SAME saved rules the 🤖 AI helper uses (one storage key per
division), so blocks ⇆ AI rules ⇆ Python convert freely — and it exports
both a `.py` and a `.blocks.json` file, and imports the json back.
فارسی: FS دو هلپر دارد و هر دو **یک فایل قانون** را می‌خوانند و می‌نویسند —
بلاک ⇆ هلپر ⇆ پایتون بدون ترجمه؛ خروجی هم `.py` هم فایل بلاکی `.json`.

**The U14 helper** is the same page opened with `?league=u14`: the robot
picture grows three extra chips — the **compass** (`heading`), the **room
number** (`room`) and the **clean-%** of a room (`clean1..3`) — and the answer
list grows **Turn to °**, an absolute compass turn (0 = right, 90 = up,
180 = left, 270 = down). A rule may now chain **three moves** (turn, drive,
turn), which is exactly the shape of "bedroom 1 is 80 % mine — walk out of
it". The page also has a ☀️/🌙 light–dark toggle.

فارسی: **هلپر U14** همان صفحه است با `?league=u14`. سه حس تازه روی نقاشی
ربات می‌نشیند — قطب‌نما (`heading`)، شماره‌ی اتاق (`room`) و درصد تمیزیِ
اتاق (`clean1..3`) — و جواب تازه‌ی «چرخش تا °» یعنی بچرخ تا قطب‌نما عدد تو
را بخواند (۰=راست، ۹۰=بالا، ۱۸۰=چپ، ۲۷۰=پایین). یک قانون حالا تا **سه
حرکت** زنجیره می‌کند: بچرخ، برو، بچرخ — دقیقاً شکلِ «اتاق‌خواب ۱ که ۸۰٪ من
شد، بیا بیرون». دکمه‌ی ☀️/🌙 هم حالت روشن/تاریک را عوض می‌کند.

Stealing (`steal`) is on in all three — no division turns it off. The battery in
U19 uses this league's own numbers, set in `BATTERY` in `league.js`: 100 % is about
60 s of full-throttle driving, the pad refills 25 %/s, `limp: 0` means an empty
battery stops the robot dead for the rest of the match, and the pad has a fixed
home at (7.1875, 5.9375) — by the east shelf.

The starter programs are **bilingual**: every English comment block carries its
Persian twin, and every branch of the logic has a Persian line of its own. The
comments are the only thing that changed — `pyreader.js` strips them, so the
compiled behaviour is byte-for-byte what it was.

## The Technical Challenge — the mission ladder

`tech:` on the group card (bottom of `league.js`) declares a ladder of small
single-skill missions, and the 🏆 button on the setup page renders whatever is
declared there — the game page knows no mission by name. Each mission is a solo
match with its own clock, its own map and ONE pass line:

1. **اولین تمیزکاری** (FS, 60 s) — clean 25 tiles. Teaches driving + the front branch.
2. **فرار از کنج** (FS, 90 s, the PEN map) — the red corner is fenced in with one
   door to the north; escape and clean 20. Teaches bumper reactions + the timer.
3. **فرش بنفش ممنوع** (U14, 120 s) — clean 30 tiles without ever rolling onto the
   purple rug (`onTick` fails the run on touch). Teaches the colour sensor.
4. **اتاق‌به‌اتاق** (U14, 150 s, the ROOMS map) — clean bedroom 1 to 50 %. Teaches
   `room` and the door-marker rugs.
5. **قبل از خاموشی برگرد** (U19, 150 s) — clean 28 tiles and never hit 0 %.
   Teaches the battery trips. The stock program does *not* quite pass this one —
   that is the point of the top rung.

A mission brings its own `check(engine, st)` (progress as value / target) and an
optional `onTick(engine, st)` that may set `st.fail`. Reaching the target ends
the run early as a pass; passes and best times are remembered per browser
(`shl_tech_done`), so the list doubles as a progress sheet. Missions run with
pets off — a mission is a controlled lab, not a match.

## What a match hands back

Two teaching loops live in the game page (they are league-agnostic — this league
just benefits):

* **The live code trace.** `pyreader.js` records which top-level `if` / `elif`
  branch fired each step (`vars._trace`), and the per-robot sensor window prints
  it as `▶ 187: elif front < 75:` — the answer to "why did my robot just do
  that?" while it drives.
* **The match report.** The results card grows a **📊 گزارش مسابقه** button: a
  heatmap of where each robot spent its time (furniture drawn on top, ✖ where
  the referee relocated it), score-over-time, and a stats table — coverage,
  distance, time stuck (the referee's own 0.85 m watchdog definition),
  relocations, wet-floor hits, seconds at 0 % battery — plus one auto-coaching
  tip per team, in Persian with an English subline.

## The folder

    league.js        the rule engine (VacuumMode), the group card, the battery
                     config, and HOUSE — this league's floor plan. Exports
                     everything the divisions need as root.VacuumLeague.
    robot.js         the 3D model, registered as the 'vacuum' chassis.
    fs/rules.js      the FS sub-league: the switches that differ, plus DRY_HOUSE
                     — HOUSE with the wet rugs filtered out, so "no wet floor"
                     is true of the map and not only of the penalty.
    fs/program.py    the program the editor loads for FS.
    fs/kit.js        THE FS RIG — three eyes, the ring, the colour sensor. Read
                     by rules.js (as its `kit:`) AND by helper.html, so the page
                     and the match can never disagree. Loaded through
                     `extra: ['fs/kit.js']` in leagues/manifest.js.
    helper/helper.html   THE FS HELPER — a page of its own (see below).
    helper/helper.js     what it does.
    helper/helper.css    what it looks like.
    u14/rules.js     the U14 sub-league.
    u14/program.py   its starter program.
    u19/rules.js     the U19 sub-league.
    u19/program.py   its starter program (the battery runner).
    bots/*.py        ready-made brains a team can load instead of writing one:
                     wallfollow, easymoves, hunter, colorsensor, goto, battery.
                     The list the UI shows is `bots:` in league.js.

## The AI page — `helper/helper.html`

This is the league's **AI section**: write the robot's brain without typing, or
type Python in the editor instead — the button on the setup page is labelled
**🤖 AI** and both FS and U14 declare it (`helper:` in their rules.js; U14
shares FS's page for now). The little room opens PAUSED as a still preview —
▶ Run is what starts it moving, ⏸ pauses it back to the pose.

FS is 8-to-11-year-olds, and they do not open an editor. The AI
button on the setup page takes them to `helper/helper.html`: **a page of its own**,
on its own URL. It is not part of the game screen and not part of the league
screen — the game only opens the link and takes a Python file back.

It asks one question, and asks it about **one sensor at a time**:

> this eye just saw something — **which way do I go?**

and nothing else. There is no strip of forward/backward blocks: a first robot
does not need a dance, it needs a reaction.

**The picture is drawn in rings, so nothing sits on anything.** The body and
the colour sensor — a square, dead centre, because that is where it looks — then
the bumper ring in its own band outside the shell, then the eyes and their beams
clear of the ring, then the names. Every sensor also carries an invisible target
far bigger than its artwork, so half a ring is as easy to tap as an eye.

**The child BUILDS rules; the page pre-bakes none.** There is no fixed menu of
combinations — that would hand every team the same algorithm. The picture is a
parts bin and **+ New rule** is the workbench: tap a sensor to drop it into the
selected rule (or start one), or **drag** it — off the robot, onto a rule, onto
+, onto the big panel. A rule holds any number of sensors ANDed together (one
colour alone, three eyes at once, an eye plus a bumper), every member is a chip
with an × in the panel, and **↑ ↓ set the rule's priority** — the order of the
list IS the order of the if/elif chain. `else` — the driving — is always last
and cannot be a rule; its one number is how fast to roll. The page opens with
no rules at all.

**The picture is the navigation.** Every sensor is drawn **dim** and there is no
list of answers at all — tapping is what opens the question. Tap a sensor on the
robot diagram (or its row in the list under it) and the whole right-hand side
becomes that sensor's question: how close is close, which of the seven ways to
go, how fast and for how long, and roughly how many degrees that comes to — plus
the lines of Python that one sensor is responsible for.
Six sensors are never six walls of text on one screen. Underneath, in full:
**3** the little room running the whole program, and **4** the finished file.

**The little room is four walls and nothing else.** No block of furniture in the
middle: it only got in the way of the one thing the room exists to show. And it
is never cut off half way — the robot drives for as long as the page is open,
and only starts again when a different sensor is picked.

**The colour sensor is asked once per colour.** Pick `green` and say turn right;
pick `purple` and say straight back; leave `white` doing nothing, because
driving over clean floor is the whole point of the match. Each colour writes its
own `elif color == …` and the chips show what each one answered.

**It shows the sensors an FS robot REALLY has, and only those.** The rig comes
from `fs/kit.js` — the very object `fs/rules.js` hands the engine as its `kit:`
— so the page and the match can never disagree:

| what | reads as | how many cards |
|---|---|---|
| three eyes forward, at 30° · 0° · −30° | `frontleft` `front` `frontright` | 3 |
| the bumper ring, told apart by half | `bumperfront` `bumperback` | 2 |
| the colour sensor, under the middle of the robot | `color` | 1, with one answer per floor colour |

Six things, nothing else. No side or rear rangefinders, no compass, no GPS —
those are what U14 opens up, and an FS card for them would be a lie. FS is also
the one division whose rig is **fixed**, so the helper reads `kit.js` and never
the robot builder's save: a build left over from another division would
otherwise put questions here about eyes an FS robot does not own.

**Why the ring is two halves and not one.** With no rear eye, a robot backed
into a wall has nothing but the ring to tell it so — and the usual answer to a
bump, *reverse*, presses it harder and holds it there for the rest of the match.
`bumperfront` and `bumperback` are what let a first program answer the two cases
differently, and `fs/program.py` does exactly that: front → back off and turn,
back → **drive forward** and turn. It is the difference between a robot that
cleans a third of the house and one that occasionally spends two minutes stuck
in a corner. `physics.js` decides which half was pressed from the direction the
collision pushed the robot; `engine.js` latches it for the tick.

**How far it swings is a number the child sets.** Under the seven directions
every number of the rule sits in one row — *closer than* (cm), *how fast to
turn* (the wheel number the Python literally writes) and *for how long* — each
with − / + **and** a box the number can simply be typed into, and each saying
underneath what it turns into in the file: `writes front < 45`, `writes wheels
-8 / -25`. Under the row, what they add up to: **about N°** of turn and **N cm**
travelled. The maths is the match's own,

    turn = |wheelright − wheelleft| × 4.58 × seconds

which is why 18 / −18 for one second reads 165°, the number `program.py` has
always quoted. The page says out loud that the figure is **roughly right**: a
robot leaning on a wall turns a little less, so the degrees are the aim and the
little room is what actually happens. Picking a new direction resets the speed to
that move's own default — 25 is a fine reverse and a hopeless spin.

Every answer is **animated**. The little room runs the child's whole program with
the same wheel maths the match uses — `throttle = wheel / 25`, `maxSpeed 1 m/s`,
`wheelBase 0.5 m`, the brain ten times a second — so "which way is better" is
something he watches, not something he is told. The answer the page marks
**smart** is always *turn away from the side that saw something*.

The output is the product: an `if` / `elif` chain of real Python, `movetime =
seconds(n)` holding each move, that `pyreader.js` compiles unchanged.

    file            what it is
    helper/helper.html  the page: skeleton, and the two shared libraries it stands on
    helper/helper.js    the sensor cards, the diagram, the little room, the Python
    helper/helper.css   its own stylesheet — it shares nothing with the game's

The game learns about it from one line in `fs/rules.js`:

    helper: 'leagues/vacuum/helper/helper.html',

That line is the whole contract. Remove it and the button falls back to the
older 🧩 block app in `fsapp/`; remove `blocks:` too and the button disappears.
Another division gets a helper of its own by shipping its own page and naming
it the same way — `index.html` never mentions this one.

The way back is deliberately small: **▶ Play with this code** writes the file to
`localStorage['shl_helper_code']` and returns to
`index.html?league=fs&helpercode=1`, which drops it into the red team's editor
and clears the key.

**The bridge out of the helper is the code panel itself.** Every number a rule
owns — the threshold, the wheel speeds, the seconds — is drawn **yellow and
editable right in the Python** (section 9.5 of `helper.js`): click one, type,
and the rule, its chips and the little room all follow. Editing either wheel
number moves both, because both come from the one speed — which is exactly the
lesson. A child learns "the code IS the rules" here, before ever meeting U14's
empty editor; the box under the panel says so in Persian and links straight to
`index.html?league=u14`. Download / Copy / Play still use `toPython()` untouched.

## Copying this league somewhere else

Take the whole `leagues/vacuum/` folder plus the shared core it sits on:
`leagues.js`, `engine.js`, `physics.js`, `sensors.js`, `pyreader.js`,
`robot-parts.js`, `robot-battery.js`, `homeobjects.js`, `render.js` and `vendor/`
(three.js). Nothing in this folder imports another league.

Then add one line to `leagues/manifest.js`:

    { id: 'vacuum', divisions: ['fs', 'u14', 'u19'] },

Load order inside the folder is `robot.js`, `league.js`, then each division.
Note that `engine.js` falls back to the `'vacuum'` chassis when a league declares
no `robot:`, which is why the divisions here do not set it. If you rename the
folder, change the id in `registerRobot()` in `robot.js` and add
`robot: '<new id>'` to each `<division>/rules.js`.

## Changing things safely

| what you want to change | the one file to edit |
|---|---|
| the house: walls, furniture, rugs, spawn points | `HOUSE` in `league.js` |
| what the robot looks like | `robot.js` |
| a rule or the match length for one age group | `rules:` / `defaults:` in `<division>/rules.js` |
| how scoring, penalties or the cat work at all | `VacuumMode` in `league.js` |
| battery drain, charge rate, where the pad sits | `BATTERY` in `league.js` |
| the program the editor opens for a division | `<division>/program.py` |
| the ready-made brains offered in the UI | `bots:` in `league.js` + the file in `bots/` |
| **which sensors an FS robot has** | `fs/kit.js` — the helper and the engine both follow it |
| anything about the FS helper page | `helper/helper.js` (and `helper/helper.css`) |
| whether FS gets the helper at all | `helper:` in `fs/rules.js` |
| a mission — its map, clock or pass line | `tech:` at the bottom of `league.js` |
| whether the league has a mission ladder at all | delete `tech:` and the 🏆 button disappears |

Do not edit the shared files to get a vacuum-only effect — every one of the rows
above is the override channel for exactly that. `MODULARITY.md` at the project
root is the full contract.
