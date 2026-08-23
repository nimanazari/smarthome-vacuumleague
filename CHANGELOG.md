## 2026-08-23 (k) — helper code runs BY ITSELF, per-team power switch, a referee-only in-match menu

- ▶ in ANY helper now lands in the game and the match STARTS ITSELF — no
  hunting for buttons (verified for FS, U14 and the full U19 route file:
  three auto-started matches, all three robots driving).
- Each team card grew a ⏻ ON/OFF switch beside "Load robot .py": an OFF
  robot spawns but never moves, so one team can test alone on the real
  floor (verified: blue frozen, red scoring).
- The burger menu DURING a match is the referee's menu only: camera,
  record, speed, sensors, guide, base code, relocations, stop/restart/end,
  official lock. Tutorial/rules/helpers/settings/change-division live only
  in the lobby. All labels follow the app language; menu icon tiles are
  smaller and every row wears the same tile style.
## 2026-08-23 (j) — smaller menu icons, a scrolling menu, 1-8x speed, the U19 route helper grows up

- The burger menu: icon tiles shrank (38 -> 26 px), rows tightened, and the
  menu CAPS at the viewport and SCROLLS — no row can fall off the screen.
- Game speed cycles 1x -> 2x -> 4x -> 8x (physics measured at ~0.02 ms/step,
  so even 8x costs a fraction of a frame). Official-lock still freezes it.
- Route helper (U19): asks WHICH robot you are (red/blue), shows that spawn
  on the photo with a START badge and its cm coordinates, and plans the
  FIRST leg from the spawn with the same A* as every other leg (the loop
  returns to point 1, never back through the spawn approach). Every
  waypoint row now carries an ESTIMATED battery %% on arrival (~2.83 %%/m),
  with the guard's recharge folded in and a 🔌 mark where it would charge.
- U19 never shows doorway marker rugs — the filter now also applies to a
  ★-saved custom map, in the game AND in the helper's planner.
- The wet puddle finally looks like WATER: a wavy glassy splash flush with
  the floor plus a light catch, instead of a blue rug rectangle.
- (user) new SVG icon set: assets/ui-icons.{svg,css,js} wired into the
  menus, tutorial and helper pages.

## 2026-08-23 (i) — ready-made robots everywhere, U19 dump paused

- The robot builder is OFF in every division (`builder: false`): teams drive
  the ready-made rig — U19 gets the full classic (7 distance eyes, bumper,
  colour, compass, GPS) so `goto()` and the Route helper work untouched.
  The 🔧 Robot button and menu row are gone; the guide now says the robot
  comes ready-made and only the code decides the match.
- U19's trash DUMP rule is paused (`dump: false`) until the Route helper can
  plan emptying trips; battery stays as the one resource U19 manages.

## 2026-08-23 (h) — the report speaks one language, the chart gets axes, ⏺ films the official view

- The whole match report follows the app language: Persian UI → all-Persian
  report; English UI → all-English (title, captions, stat rows, room rows,
  events table, coaching tips).
- Score-over-time chart: real axes — 0 at the BOTTOM-LEFT, score climbs up,
  time runs left→right with 0:00 / mid / end ticks; the canvas is pinned
  LTR so RTL pages can never mirror it.
- ⏺ Recording is now the OFFICIAL film: starting it snaps the camera to the
  fixed TOP view and LOCKS the view button until the whistle — every
  protest is judged from the same evidence.

## 2026-08-23 (g) — five fixes + the Route helper's settings, 🎬 Cinematic, ⏺ recording

- FIXES: rugs are DRAG-EDITABLE in the 🛠 house edit (move lands in the map
  for «سیو مپ» too) · Ctrl+Z/Y in the Map Maker now wins even while a
  slider/name box holds focus · L-corner walls click flush on RELEASE with a
  stronger 0.42 m magnet · Technical challenge moved to the League section
  of the menu · the league picker is SMOOTH (no fullscreen blur; the 3D
  scene stops rendering behind it).
- **Route helper**: the photo fits ONE screen (viewport-capped, sticky) —
  drop points with zero scrolling; a ⚙ settings box: loop on/off, battery
  guard on/off, LOW threshold, and the stay-mode — charge to N % **or sit
  N seconds on the pad** (compiled as a real timer loop in the Python).
- **🎬 Cinematic camera**: one more stop on the camera cycle — an
  auto-director with HARD CUTS every 4–7 s: slow orbits (high + low), both
  robot POVs, a SPLIT-SCREEN duel, a top crane, and a chase cam behind the
  score leader. Manual views stay fully manual.
- **⏺ Match recording**: a menu row captures the 3D canvas (cinematic
  included) to a .webm at 30 fps; if it is still armed at the whistle the
  file saves itself — the full-match video that ends every argument.
- **The report** now closes with room-by-room clean-% for both teams
  (kitchen / bedrooms / bathroom), on top of the existing heatmap, distance,
  stuck time, relocations, wet hits, CPU and crash rows.

## 2026-08-23 (f) — ZERO-INSTALL for the kids

- **Nothing to install any more.** `serve.bat` now tries `python`, then
  `py`, and when neither exists it starts **`serve.ps1`** — a static web
  server written in pure PowerShell (TcpListener, proper MIME types,
  path-traversal-safe), which every Windows already has. Double-click →
  browser opens → play. Tested end-to-end: the whole game loaded and a
  match ran (18-23) served by PowerShell alone.
  دیگر هیچ نصبی لازم نیست: پایتون بود با پایتون، نبود خودِ ویندوز سرور
  می‌شود — بچه فقط دوبار کلیک می‌کند.
- serve.ps1 is deliberately PURE ASCII — PowerShell 5.1 reads BOM-less
  files as ANSI, so a Persian comment or an em-dash would break it on the
  kids' machines (found the hard way in testing).
- Both kits rebuilt with serve.ps1 inside.

## 2026-08-23 (e) — AdminKit + TeamKit, base/guide/solution per league

- **Two distribution kits** (`python tools/make-kits.py` rebuilds both):
  · **AdminKit/** — the organiser's FULL copy: Map Maker, champion
    solutions, referee tools, tools/, docs/, everything.
  · **TeamKit/** — the teams' copy: play + code only. The Map Maker is
    stripped (files AND the league's `mapmaker:` line, so every button/row
    hides itself) and the champion solutions are removed from bots/ and the
    robots menu; the teaching bots (wallfollow, easymoves, goto, hunter,
    colorsensor, battery) stay. Verified live on its own port: no Map-Maker
    row, no champions in the menu, match runs, helpers work.
- **Per-league trio** is now explicit: base code (`<div>/program.py` +
  the in-game Base-code button), guide (rulebook + in-game 📖 +
  `<div>/README.md`), full solution (champions — **organizer-only**, in
  `organizer-only/champions/` with a testing README).
  هر رده: بیس‌کد + راهنما + کد کامل؛ کد کامل فقط دست برگزارکننده.

## 2026-08-23 (d) — the TEAM KIT

- **`TeamKit/`** — the ONE folder the organiser copies to every team:
  the full game (offline, serve.bat), rulebook.html, RULES.md, CODING.md,
  the curriculum, all three helpers, all maps — and a team-facing README
  (how to run, where to start, what to submit). Built by
  `python tools/make-team-kit.py` — re-run it after any change and hand the
  fresh folder out. Verified end-to-end: served the kit on its own port,
  all divisions loaded, a match ran (26-31), rulebook + helpers + guides
  all reachable. 69 files, ~2.2 MB.
  بسته‌ی تیم‌ها: یک پوشه، کپی کن و بده؛ با یک فرمان همیشه تازه می‌شود.

## 2026-08-23 (c) — the OFFICIAL RULEBOOK + a tidy root

- **`rulebook.html`** — the print-ready official rulebook (Ctrl+P → PDF),
  structured after the reference PDF (robot & sensors → arena → sub-leagues
  → procedure → scoring → general rules) but written to THIS simulator's
  real numbers: room numbers 0–5, colour codes 0–7, tiles 429/425, times
  120/180 s, overtime +10/+5→35, penalties 2/5, wet −2, battery 60 s /
  +25 %/s, the push-open door, leg-only furniture, per-league sensor table,
  the learning ladder. **The two photos are TAKEN LIVE from the game's own
  3D engine** (hero 2.5D + exact straight-down ortho) so they always match
  the official floor. کتابچه‌ی رسمی دوزبانه با عکس زنده از خود بازی.
- **Fixed: the photo pipeline silently fell back** — Engine needs the
  Leagues registry, so rulebook.html AND the Route helper now load the full
  league chain; the Route helper's background is a REAL photo now too
  (it had been quietly falling back to the flat drawing).
- **Root tidied, zero-risk**: the two reference PDFs and the map-export
  jsons moved into `docs/reference/` (nothing in the code referenced them).
  ریشه‌ی پروژه برای کامپیوترهای شرکت‌کننده مرتب شد.

## 2026-08-23 (b) — THE MAP STANDARD + the reference STANDARD house

- **استاندارد ساخت نقشه ثبت شد** (`maps/MAP-STANDARD.md`، دوزبانه):
  مبلمان چسبیده به دیوار؛ ۳ خواب + آشپزخانه + پذیرایی (تلویزیون + مبل
  روبه‌رویش) + سرویس؛ **فقط یک اتاقِ دردار** با room-number معلوم؛ بقیه‌ی
  ورودی‌ها باز و بزرگ (۳ کاشی)؛ فرش‌های نشانه **همه یک رنگ** و فقط FS/U14؛
  فرش پذیرایی رنگ متفاوت + کندکننده. The organiser's standing map rules.
- **خانه‌ی استاندارد** (`maps/standard.js` · «The STANDARD house» در منوی
  نقشه‌ها): ساخته‌شده مو‌به‌موی همان استاندارد — درِ هل‌بازشو روی
  اتاق‌خواب ۱ (room == 2)، دور و بر چمن، چراغ دیواری، همه‌ی مبلمان
  دیوارچسب. Validator: all rooms 100 %, zero sealed. Match-tested with the
  working door.
- **U19 بدون فرش نشانه**: `u19/rules.js` نسخه‌ی NO-MARKERS نقشه‌ی رسمی را
  می‌سازد (فقط فرش سبز + کف خیس می‌ماند) — درسِ U19 موقعیت است، نه رنگ.
  U14/FS دست‌نخورده. Verified: u19 rugs = green+wet only.
- validate-map و مسیریاب هلپر مسیر، **در** و **چراغ دیواری** را عبوری
  حساب می‌کنند (در با هل باز می‌شود).

## 2026-08-23 — push-open DOORS, surround ground, round rugs, wall lamps

- **درِ واقعی 🚪**: آبجکت جدید «در» در پالت سازه. بسته = مثل دیوار (سپر و
  سنسور فاصله می‌بینندش)؛ ربات ~۰٫۲۵ ثانیه هلش بدهد → لته روی لولا باز
  می‌شود (انیمیشن ۳بعدی)، ~۸ ثانیه باز می‌ماند، بعد خودش بسته می‌شود —
  و هیچ‌وقت روی رباتی که در چارچوب ایستاده بسته نمی‌شود. Headless-tested:
  push → open → pass → auto-close. Doors are dynamic solids: they join and
  leave the collision + ray worlds live.
- **دور و برِ خانه**: انتخاب در پنل ابعاد مپ‌ساز — تاریک / چمن 🌿 /
  سنگ‌فرش 🪨 — روی خود نقشه ذخیره می‌شود و بازی زمین را همان‌رنگ می‌کشد
  (مش تختِ بی‌هزینه؛ FPS دست نمی‌خورد).
- **فرش گرد**: اسلایدر «گردی» (۰=مستطیل … ۱=بیضی) در اینسپکتور فرش —
  هم بوم ۲بعدی هم فرش ۳بعدی (ShapeGeometry) گرد می‌شوند.
- **چراغ دیواری (sconce)**: دکورِ نورانی روی دیوار در ارتفاع ۱٫۴ متر —
  هیچ برخوردی در ارتفاع ربات ندارد؛ فقط نما.
- **Undo depth** ۸۰ → ۳۰۰ (Ctrl+Z / Ctrl+Y).
- Reminder shipped in-code: table / dining / desk / bench were ALWAYS
  leg-only — the robot drives under them.

## 2026-08-22 (j) — the organiser's flat ships, L-corner magnets, rug freedom

- **The organiser's Map-Maker export IS the official floor now**
  (`vacuum-rooms-22-fs (2).json` → `maps/grown-rooms.js`): TV mid-living-room,
  a piano, rotated beds, bathroom poufs, re-cut doors — bathroom open to the
  hall. The wet pair re-laid mirrored at (6.875, 3.4375)/(6.875, 10.3125) on
  verified-clear floor. validate-map: **all rooms 100 %, zero sealed cells**;
  tiles FS 429 · U14/U19 425; match-tested. نقشه‌ی برگزارکننده رسمی شد.
- **L-corner magnets**: a wall dragged near another's END now clicks into a
  clean flush corner (both orientations), on top of the butt/T/co-align
  snaps. کنج‌های L خودشان جفت می‌شوند.
- **Rug freedom**: every rug kind (green/purple/orange/cyan/wet) resizes up
  to 10×8 m via the inspector sliders and takes any colour (the picker and
  the quick swatches) — the game renders the custom colour. فرش‌ها آزاد شدند.
- **Board panel**: 16×16 / 22×22 preset chips + a live "N×N tiles = X×Y m"
  readout. پنل ابعاد زمین با پرست و متراژ زنده.

## 2026-08-22 (i) — one-click map saving, magnetic walls, solid downloads

- **«سیو مپ» یک‌کلیکه، همان‌جا که هستی**: روی نوار ادیت خانه دکمه‌ی
  💾 Save map آمد و در «نقشه و تنظیمات» سه ردیف: **💾 سیو مپ** (کف فعلی —
  با ادیت‌های زنده — دیفالتِ همین ساب‌لیگ می‌شود، بی‌سؤال و بی‌ریلود)،
  **📂 لود فایل مپ** (فایل .json بده — یک کلیک و همان دیفالت می‌شود؛ برای
  توزیع نقشه‌ی رسمی به تیم‌ها) و **🗑 برگشت به مپ اصلی**. FS خودکار خشک
  می‌شود. One-click save/load/reset of a division's default floor.
- **Magnetic walls** in the Map Maker: dragging or drawing a wall near
  another CLICKS it on — co-aligned lines, end-to-end butts, clean T-joints
  and corners (0.3 m magnet). دیوارها حالا خودشان به هم می‌چسبند.
- **JSON export fixed**: the download link now lives in the page and the
  blob URL outlives the click (it was revoked instantly — that was the
  flaky download). دانلود خروجی JSON دیگر نمی‌پرد.

## 2026-08-22 (h) — ★ make-this-the-default maps

- **The Map Maker grew a ★ «دیفالتِ رده» button**: stamp the open map as a
  division's OFFICIAL floor. Stored per browser (`shl_defmap_<id>`); the game
  lays it over the division at load (FS auto-dried), the Route helper plans
  on it too, and «هیچ‌کدام» restores the shipped defaults. For the WHOLE
  project, «خروجی JSON» + paste into the map's file under
  `leagues/vacuum/maps/`. Tested: stamp → U14 played the custom floor,
  FS/U19 untouched → unstamp → shipped floor back.
  دکمه‌ی ★ در مپ‌ساز: نقشه‌ی ادیت‌شده، دیفالتِ همیشگی رده می‌شود.

## 2026-08-22 (g) — block icons, PYTHON → BLOCKS reverse, tidy chrome

- **Every block wears an icon**, MindStack-style: 📡 ultrasonic, 🛡️ bumper,
  🎨 colour; ⬆️⬇️↘️↙️↩️↪️🛑 on the moves — in the palette AND inside the
  snapped stacks. آیکون روی همه‌ی بلاک‌ها.
- **PYTHON → BLOCKS (reverse)**: the footer's "Python → blocks" button opens
  a paste box (or a .py file picker); any helper-written file parses back
  into stacks — conditions, wheel pairs (reverse-mapped to the move + speed),
  seconds() and second moves included. Round-tripped 2 rules build → wipe →
  restore, byte-equal. حالا پایتون را بده، بلاک تحویل بگیر.
- **Blocks header tidied**: theme · Start over · Back to the game only; the
  AI-helper link left the header (it lives in the game's menu), the file
  buttons stay in the footer. هدر بلاکی خلوت شد.
- The Sims edit button is now just the icon with a small **EDIT** under it —
  no more "mid-game Sims style" copy. دکمه‌ی ادیت فقط آیکون + EDIT.

## 2026-08-22 (f) — POV camera, MindStack blocks, sectioned menu, richer house

- **Camera views**: the cycle is now 2.5D → Top → 3D → **360° orbit** (slow
  auto-circle) → **Robot POV** (ride team 1's shell, look where it looks) —
  from the menu's Camera view row. نمای ۳۶۰ درجه و دوربین اول‌شخص ربات.
- **Blocks helper, MindStack edition**: English by default (follows the game's
  🌐 choice; Persian gets Vazirmatn via @font-face in all three helpers), the
  distance parts are named **ultrasonic sensors** ("distance to the RIGHT
  wall closer than …"), and the stacks are REAL puzzle columns — full-width
  candy blocks with a tab that clicks into the next block, keywords (if /
  and / then) inside the blocks, a snap-pop animation on add, and the
  MindStack 3D-shadow style + terminal-look code panel. Word-glue fixed.
- **Sectioned burger menu**: Learn (Tutorial · Technical challenge · Rules) /
  Compete (Match mode · Standings) / Helpers (AI · Blocks · Robot builder) /
  Map & Settings (settings — with Map Maker INSIDE it — · Camera view) /
  League (Change division · Language LAST). In-match rows appear only while
  a match runs. منوی بخش‌بندی‌شده؛ مپ‌میکر داخل تنظیمات؛ زبان آخر.
- **Match mode is only the match**: the division tabs and every tool button
  left the panel (they are menu rows). The map choice is remembered **per
  division** (`shl_map_<id>`), so each sub-league can keep its own floor.
- **Two new rug colours** — orange (6) and cyan (7): purple-like markers the
  colour sensor tells apart, wired through physics → sensors → renderer →
  map maker palette → both helpers. The flat's doorways are colour-coded now
  (bedroom1 purple, bedroom2 orange, bedroom3 cyan, kitchen green, bathroom
  orange). دو رنگ فرش تازه؛ درِ هر اتاق رنگ خودش.
- **The flat got livelier**: two poufs FACING the TV, plants in the kitchen /
  bathroom / hall, a lamp in bedroom 3; the dump moved off the TV corner.
  validate-map: all 5 rooms still 100 % reachable.
- **Safe referee relocation**: teleports only onto FULLY-open tiles (no more
  robots wedged under beds) and nudges the shell out if it still grazes
  something; the map maker draws a faint red NO-SPAWN margin around every
  solid piece. جابه‌جایی امن + نمایش حریم اسپان در مپ‌ساز.
- **The in-game rulebooks** grew a complete bilingual sensor table (every
  python name, per division) + an English rules summary. قوانین کامل‌تر شد.
- Front page: big **Simulation League** title, the 4-step breadcrumb is gone
  for good (setStep is a no-op).

## 2026-08-22 (e) — the LOBBY: one page, one menu

- **Picking a division now opens THE LOBBY**: the big 3D house with one quiet
  title pill ("First Step — Smart Home · Everything is in the ☰ menu") and
  nothing else — no setup panel, no button rows, no robot-builder step in the
  way. انتخاب رده مستقیم به لابی می‌رود: فقط خانه‌ی بزرگ و یک خط عنوان.
- **Everything moved into the burger menu**, language-aware and per-division:
  Match mode (opens the old setup panel), Tutorial, AI helper / Blocks /
  Route, Technical challenge, Rules, Standings, Map & settings, Robot
  builder, Map Maker, Change division, Language. The in-match rows (Stop,
  Relocate, Official mode…) only appear while a match is actually running.
  همه‌ی دکمه‌ها به منوی ☰ رفتند؛ ردیف‌های حین مسابقه فقط وقت مسابقه.
- The front page lost its leftovers: "Vacuum Cleaner", "Pick your age
  division", the Webots footer, the breadcrumb and the duplicate subtitle —
  it is now the title "Smart Home" and three doors with «?" buttons.
  صفحه‌ی اول فقط «Smart Home» و سه در با دکمه‌ی «؟».
- Browser-tab title → "Smart Home League".

## 2026-08-22 (d) — English-first minimal front page, the «?» buttons, language switch

- **The front page is MINIMAL and ENGLISH by default**: three clean division
  doors — code, robot, name, age, GO — and nothing else. All the explanation
  (blurb, rules bullets, the division's tools) moved behind a round **«?»
  button** on each door, opening a popover with its own Let's-go.
  صفحه‌ی اول مینیمال و انگلیسی شد؛ توضیحاتِ هر رده پشت دکمه‌ی «؟» رفت.
- **🌐 Language in the ☰ menu**: picking فارسی stores `shl_lang` and RELOADS,
  so the whole flow restarts in Persian from the first screen (and back).
  زبان از منو عوض می‌شود و صفحه از اول با همان زبان بالا می‌آید.
- Removed dangling site-only asset links (`../assets/new-lobby.*`,
  `../vacuum.html`) — the standalone folder now loads with zero 404s.
  لینک‌های مرده‌ی سایت حذف شد؛ صفر ۴۰۴.

## 2026-08-22 (c) — full three-division test pass, the Route helper, map QA, first-screen polish

- **End-to-end engine tests, all three divisions** (hand-stepped real matches):
  FS champ 74–48 over 120 s; U14 turn-to verified in-engine (0°→277°→drive→178°,
  ±12° tolerance) and the 10 s stuck-relocate fired as the rules say; U19 ran
  5 minutes with charge cycles and NEVER hit 0 % battery (min 14 %).
  تست کامل موتور برای هر سه رده — تابع ترن‌تو در مسابقه‌ی واقعی تأیید شد.
- **📍 helper3, the U19 ROUTE helper** (`helper3/route.html`): tap the real
  map, drop numbered waypoints, get a goto()/atgoal wp-machine. The page
  PLANS: A* over the inflated house grid + line-of-sight smoothing writes the
  doorway via-points itself, and the battery guard gets one pre-planned safe
  chain to the dock per route node — folded into the same wp machine — plus
  an anchor node to rejoin the route after charging. Fixes found while
  testing: atgoal chains needed goto() on the SAME step when advancing wp,
  and straight-to-dock charging died behind walls. `wp`/`charging` are seeded
  like `timer`. هلپر مسیر: نقطه‌به‌نقطه با عبور از درها و گارد باتریِ مسیر‌دار.
- **tools/validate-map.js** — headless map QA: floods from the red spawn over
  the robot-inflated grid and proves EVERY room reachable. It caught two real
  bugs in the new flat: the TV sealed the top corridor and the sofa sealed
  the bathroom door (both moved; all 5 rooms now 100 % reachable; tiles
  unchanged 431/427). اعتبارسنج نقشه، دو گیر واقعی خانه را گرفت.
- **First screen polish**: aurora backdrop, shine-sweep glass cards, and a
  TOOLS badge row on every division door (🤖/🧩/📍/📝/🔧 read straight off
  rules.js); team-setup cards got team-coloured glows and calmer inputs.
  منوی اول و کارت‌ها حرفه‌ای‌تر شدند؛ ابزارهای هر رده روی کارتش پیداست.
- **CURRICULUM.md** — the 3×10-lesson bilingual plan (FS rules → U14
  state+heading → U19 position+resources), every lesson pinned to a real
  file in the repo. طرح درس کامل سه رده با کدبیس.
- `helperLabel` on a division renames its helper button (U19 shows 📍 Route).

## 2026-08-22 (b) — the six-zone flat, the Blocks helper, per-division kits, more maps

- **The official house is now a real flat** (`maps/grown-rooms.js`,
  hand-drawn): hall/living (room 0), kitchen (1), bedrooms 1/2/3 (2/3/4),
  bathroom (5) — six zones, 2-tile doors, a marker rug at every door, the wet
  pair mirrored in the hall. Cleanable tiles measured: FS **431**, U14/U19
  **427**. `clean4`/`clean5` wired through the game (the engine already wrote
  one per declared room). خانه‌ی رسمی شش‌ناحیه شد: هال، آشپزخانه، سه
  اتاق‌خواب و سرویس بهداشتی.
- **FS has TWO helpers now** — the 🤖 AI helper and the NEW 🧩 **Blocks
  helper** (`helper2/blocks.html`, Persian-first, Scratch-style stacks).
  Both read/write THE SAME rules file (`shl_helper_fs_rules`), so blocks ⇆
  AI rules ⇆ Python interconvert with no translation; exports `.py` and
  `.blocks.json`, imports the json back; same dark/light key. The game's
  setup page shows both buttons (`helper2:` in fs/rules.js).
  اف‌اس دو هلپر دارد: عادی و بلاکیِ مایند‌استکی — یک فایل، دو نما.
- **Per-division sensor clarity**: U14's rig moved out of rules.js into its
  own `u14/kit.js` (`VacuumU14Kit`), and every division folder gained a
  bilingual `README.md` listing exactly what that division can sense
  (fs/, u14/, u19/). کیت هر رده فایل خودش + README دوزبانه.
- **More maps in the menu**: cosy rooms 16×16, classic 16×16, big open-plan
  22×22, and the NEW open training hall (`maps/open.js`) — all pickable from
  the setup page's map list. چهار نقشه‌ی انتخابی در منو.
- **League tools in the burger menu**: 🛠 Map Maker, 🤖 AI helper and
  🧩 Blocks helper now sit in the ☰ menu too, following the current division.
  مپ‌ساز و هلپرها در منوی همبرگری.
- U14's in-game guide now lists the six zones; the sensors panel shows
  `clean1..clean5` per room. Next up (planned): the first-screen main menu
  redesign. بعدی: بازطراحی منوی اولیه.

## 2026-08-22 — one big rooms house for everyone, the U14 helper, modular maps

- **All three divisions** now play the 22×22 ROOMS house (`vacuum-rooms-22`):
  kitchen / bedroom 1 / bedroom 2 with real walls, doors and door-marker rugs.
  FS keeps its dry floor (wet pair filtered out). Measured cleanable tiles:
  FS **426**, U14/U19 **422**. `room` + `clean1..clean3` live everywhere.
- **U14 helper (primary)**: `fs/helper.html?league=u14` now shows the compass,
  the room number and the clean-% chips on the robot picture; conditions can be
  `heading` (facing ±45°), `room == N`, `cleanN > P`; the new **Turn to °**
  answer is an absolute compass turn, and a rule can chain THREE moves —
  turn / drive / turn — the exit-the-finished-room plan. Compiled as numbered
  `nextmove` legs; verified end-to-end against pyreader.
- **Seeded `nextmove` / `err`** in the game's controller vars — fixes a latent
  crash for ANY helper file that used a second move (the EDITOR SETUP block is
  stripped by the compiler, so they were never defined).
- **✏️ edits THE map you see**: the setup page's edit button now hands the
  actual current map (official included) to the map maker (`?edit=::current`);
  the map maker draws room rectangles, keeps `rooms` through edits, and scales
  them with tileSize changes.
- **Modular maps**: every house is one file under `leagues/vacuum/maps/`
  (`house.js`, `rooms.js`, `grown.js`, `grown-rooms.js`) hanging off
  `root.VacuumMaps`, loaded via the new `pre:` list in `leagues/manifest.js`
  (all three loaders — game, map maker, `_drive.html` — understand it).
- **The helper is a module of its own** — moved to `leagues/vacuum/helper/`
  (html + js + css, one copy); FS and U14 declare it with one `helper:` line
  each. هلپر ماژول مستقل شد: `leagues/vacuum/helper/`.
- **Helper dark / light**: ☀️/🌙 toggle, follows the system on first visit,
  remembered per browser.

# تاریخچه‌ی تغییرات — Changelog

هر تغییر با تاریخ، فایل‌های دست‌خورده و دلیلش. قاعده‌ی این پرونده: چیزی که
این‌جا نیست، اتفاق نیفتاده.

---

## ۲۱ مرداد ۱۴۰۵ — 2026-08-12

### موج چهارم: چهار فاز نقشه‌ی راه — لیگِ مسابقاتی واقعی

**فاز ۱ — تکرارپذیری و عدالت.** فیزیک روی گام ثابت ۱/۶۰ ثانیه رفت (دیگر به
فریم‌ریت مانیتور وابسته نیست)؛ PRNG بذردار mulberry32 وارد `physics.js` شد و
هر سه نقطه‌ی تصادفیِ موتور (مقصد جابه‌جایی، جهت بعد از آن، جای پشتیبان داک)
از آن می‌خوانند؛ ورودی «🎲 Seed» در تنظیمات و ثبت بذرِ استفاده‌شده در همه‌جا.
*آزموده:* بذر ۴۲ دو بار → امتیاز و مختصات نهایی ربات تا ۶ رقم اعشار یکسان،
با وجود ۳ جابه‌جایی داور. سنجش CPU هر برنامه (میانگین/بیشینه/تیک‌های کند) و
شمارش تیک‌های خطا هم به گزارش مسابقه اضافه شد. — `physics.js`، `engine.js`،
`index.html`

**فاز ۲ — لایه‌ی تورنمنت محلی.** دفتر ثبت تیم‌ها (`shl_teams`) با
تکمیل خودکار نام در لابی؛ قرعه‌کشی داخل خود برنامه: **لیگ دوره‌ای** برای هر
تعداد تیم (روش دایره‌ای) یا **جام کلاسیک ۶ تیمه** (سه بازی، دو شانس مجدد،
دو نیمه‌نهایی، فینال — همان اسلات‌های m1..final سایت قدیم، این بار بی‌سرور)؛
دکمه‌ی «▶ بازی» لابی را پر می‌کند، نتیجه‌ی ثبت‌شده خودش براکت را جلو می‌برد
و قهرمان اعلام می‌شود. بازی حذفی با **مرگ ناگهانی** (+۵ثانیه‌های پیاپی تا
برتری — `mustWin` در `engine.js`) هرگز مساوی نمی‌ماند. گزارش مسابقه هم
خروجی **PNG** (نقشه‌ی حرارتی) و **JSON** کامل گرفت.

**فاز ۳ — ابزار داور.** دفتر وقایع زمان‌دار (جابه‌جایی، کف خیس، توقف/ادامه،
تغییر سرعت، ویرایش خانه، وقت اضافه، خطای برنامه، پایان/شروع دوباره، قفل) در
گزارش و JSON؛ منوی جابه‌جایی با انتخاب «با جریمه / بدون جریمه / انصراف»؛
شمارش معکوسِ لغوشدنی + دکمه‌ی «⟲ Restart match» (شروع اشتباه هیچ‌جا ثبت
نمی‌شود)؛ بنر بزرگ «⏸ توقف بازی» برای سالن؛ و **حالت مسابقه‌ی رسمی 🔒** با
PIN که ویرایش خانه، سرعت ۲x، Shift+drag و هر راه تعویض کد را قفل می‌کند.

**فاز ۴ — تحویل کد.** SHA-256 هر فایل هنگام بارگذاری کنار نامش می‌نشیند و
هشِ کدی که واقعاً مسابقه داد در رکورد ثبت می‌شود؛ قفل رسمی = انجماد کد؛
لینت رده (فایل FS در U19 و برعکس اخطار می‌گیرد)؛ هلپر دکمه‌ی «▶ Team 2»
گرفت (کلید جدا — دو تیم روی یک دستگاه همدیگر را بازنویسی نمی‌کنند) و خروجی
هلپر مهر تاریخ/رده می‌خورد. بخش «۱۲. برگزاری رسمی» با هر ۱۱ بند به
`RULES.md` اضافه شد.

### موج سوم: «هم کلاس درس، هم میدان مسابقه»

* **دفتر مسابقات 🏆** — هر مسابقه‌ی واقعی (نه دمو، نه مأموریت، نه آموزش)
  لحظه‌ی پایان به‌طور خودکار ثبت می‌شود: تیم‌ها، رده، نقشه، امتیازها، وقت
  اضافه، جابه‌جایی‌های داور، تاریخ. دکمه‌ی «🏆 امتیازات» در لابی و روی کارت
  نتیجه: **جدول امتیازات** (برد ۳ / مساوی ۱، تفاضل کاشی)، **تاریخچه** با
  تاریخ شمسی، خروجی **CSV** برای برگزارکننده، و پاک‌کردن با تأیید. روی کارت
  نتیجه هم نشان «✅ در دفتر مسابقات ثبت شد» می‌آید. (کلید
  `shl_results`، سقف ۴۰۰ رکورد) — `index.html`
* **کد کاملِ «قهرمان» برای هر رده** — سه برنامه‌ی مرجعِ سنجیده‌شده در
  `bots/champ_fs.py`، `bots/champ_u14.py`، `bots/champ_u19.py` و بالای منوی
  ربات‌ها: FS (فرار به سمتِ بازتر، چرخش بزرگ در کنج — انفرادی ۱۰۰ در برابر ۸۴
  کاشیِ استارتر)، U14 (درسِ اندازه‌گیری‌شده‌ی «همیشه یک‌طرف بچرخ»: ۱۴۲ در
  برابر ۵۴ کاشی!)، U19 (ماشین حالت با دو مأموریت شارژ/تخلیه، مهلت سفر ۹
  ثانیه‌ای که قبل از داورِ گیرکردن فرار می‌کند — هرگز باتری‌اش نمی‌میرد).
  همه کامنت دوزبانه دارند و هر ادعایشان با شبیه‌سازی تأیید شده.
* **آموزش کاملِ رده‌محور 🎓** — دکمه‌ی آموزش به لابی برگشت و هر رده درس‌های
  خودش را دارد (فارسی، راست‌به‌چپ، با اجرای زنده روی نقشه و ربات همان رده):
  FS شش درس (چشم‌ها، چپ/راست، رنگ، سپر دو نیمه، تایمر، حرکت‌های آسان)،
  U14 شش درس (قوس بدون توقف، فرش‌ها، state چندتکه، سه سبک حرکت، قطب‌نما،
  کنج)، U19 پنج درس (باتری، داک و goto، قانون بودجه، ماشین حالت، مخزن).
  هر ۱۷ درس تست خودکار شده‌اند. — `index.html` (مجموعه‌های
  `FS_LESSONS` / `U14_LESSONS` / `U19_LESSONS`)
* **قوانین داخل بازی 📖** — هر رده دفترچه‌ی قوانین خودش را در `rules.js`
  خودش اعلام می‌کند (`guide:`) و دکمه‌ی «📖 قوانین» در لابی همان را
  می‌کشد: هدف بازی، زمان و وقت اضافه، جریمه‌ها، ویژگی‌های رده، و بخش
  «از کجا شروع کنم؟» با مسیرِ آموزش ← چالش فنی ← قهرمان ← مسابقه.
  — `fs/rules.js`، `u14/rules.js`، `u19/rules.js` + رندر عمومی در `index.html`
* **بازطراحی صفحه‌ی امتیاز/نتیجه** — تابلوی امتیازِ حین مسابقه (کارت‌های
  شیشه‌ای با نوار رنگ تیم)، پس‌زمینه‌ی صحنه برای صفحه‌ی نتیجه، و کارت
  نتیجه/گزارش با همان زبان طراحی ۲۰۲۶.
* **ROADMAP.md** — نقشه‌ی راه مسابقاتی‌شدن بر پایه‌ی ممیزی پنج‌عامله‌ی کد
  (۴۰+ کمبود تأییدشده با مدرک خط‌به‌خط): تکرارپذیری (گام ثابت فیزیک، بذر
  تصادف)، ثبت و جدول، ابزار داور، تحویل کد. فاز ۲ بند ۶ (ثبت نتیجه) در همین
  موج انجام شد.

### موج دوم: دیزاین کاملاً جدید صفحه‌ی اول و لابی تیم‌ها

* **صفحه‌ی انتخاب رده از نو ساخته شد** — به‌جای مودالِ کارت‌های انگلیسی، یک
  صحنه‌ی تمام‌صفحه به سبک «انتخاب شخصیت»: پس‌زمینه‌ی کاشی‌کاریِ خانه‌ی هوشمند با
  جاروی نور متحرک، لوگوی ربات با انیمیشن، تیتر فارسی «لیگ جاروبرقی هوشمند» و
  سه درگاه بزرگ FS / U14 / U19 که ربات واقعی همان رده را روی سکو نشان می‌دهند
  (چشم‌های آبی FS، باتری سبز U19)، با سن و توضیح و چیپ‌های ویژگی به فارسی.
  روی نمایشگر ۷۲۰p بدون اسکرول جا می‌شود؛ موبایل هم بدون سرریز افقی.
  — `index.html` (بلوک `#leaguePanel`، تابع `buildDivisionCards`، لایه‌ی CSS
  «THE 2026 FACE» در انتهای استایل)
* **لابی تیم‌ها «سالن مسابقه» شد** — تب‌های رده به‌صورت داک قرصی وسط صفحه که تبِ
  فعال گرادیان رنگ همان رده را می‌گیرد (FS فیروزه‌ای، U14 کهربایی، U19 سبز)؛
  تیتر «مسابقه‌ی خانه‌ی هوشمند»؛ دو کنسول تیم با نوار قرمز/آبی و سکه‌ی
  شیر-یا-خط روی سکوی خودش بین آن دو؛ دکمه‌ی بزرگ «▶️ شروع مسابقه» با نبض نوری.
  برچسب‌ها فارسی شدند: «بارگذاری ربات (.py)»، «نقشه و تنظیمات»، «رنگ ربات»،
  راهنمای گوشه‌ها. هیچ ID یا رفتاری عوض نشد — فقط پوسته.
  — `index.html` (لایه‌ی CSS جدید + `pickLeague` و `vacSkin` برای برچسب‌ها)

### موج اول: بار آموزشی

* **ردیابی زنده‌ی کد در بازی** — هر تیک، خطِ if/elif ای که واقعاً فرمان داده
  ثبت می‌شود (`vars._trace` در `pyreader.js`) و پنجره‌ی سنسورهای هر ربات آن را
  زرد نشان می‌دهد: `▶ 187: elif front < 75:‎`. جواب زنده‌ی «چرا رباتم این کار
  را کرد؟» — `pyreader.js`، `index.html` (drawScope و پنل سنسور توتوریال)
* **گزارش پایان مسابقه (debrief)** — دکمه‌ی «📊 گزارش مسابقه» روی کارت نتیجه:
  نقشه‌ی حرارتی مسیر هر دو ربات روی نقشه‌ی خانه (مبلمان رسم می‌شود، ✖ = جای
  جابه‌جایی داور)، نمودار امتیاز-زمان، جدول آمار (پوشش، مسافت، زمان گیرکردن با
  همان تعریف ۰٫۸۵ متری داور، جابه‌جایی‌ها، کف خیس، ثانیه‌های باتری صفر) و یک
  نکته‌ی مربی‌گری خودکار فارسی برای هر تیم. — `index.html`
  (`resetMatchLog` / `logFrame` / `drawDebriefHeat` / `fillDebriefTips`)
* **بخش «چالش فنی» 🏆** — نردبان پنج مأموریت تک‌مهارتی، جدا از مسابقه‌ی اصلی:
  ۱) اولین تمیزکاری (FS) ۲) فرار از کنج، با نقشه‌ی PEN که گوشه‌ی ربات را حصار
  می‌کند (FS) ۳) فرش بنفش ممنوع (U14) ۴) اتاق‌به‌اتاق روی نقشه‌ی Rooms (U14)
  ۵) قبل از خاموشی برگرد (U19). قبولی و رکورد زمان در مرورگر می‌ماند و کنار
  پله ✓ می‌خورد؛ رسیدن به هدف مسابقه را زودتر تمام می‌کند. تعریف مأموریت‌ها
  داخل خود لیگ است (`tech:` روی کارت گروه) و صفحه‌ی بازی هیچ مأموریتی را به
  اسم نمی‌شناسد. — `leagues/vacuum/league.js`، `index.html`
  (`openTech` / `startMission` / `missionStep`)
* **پل دوران گذار FS ← U14 در هلپر** — در پنل «Your Python» هر عددی که مال
  قانون است (آستانه، سرعت چرخ، ثانیه) زرد و قابل‌ویرایش در خودِ کد است؛ عدد را
  عوض کنی قانون و چیپ‌ها و اتاقک همان لحظه به‌روز می‌شوند. زیرش جعبه‌ی
  «🎓 دوران گذار به U14» با لینک مستقیم به ادیتور.
  — `leagues/vacuum/fs/helper.js` (بخش 9.5)، `helper.html`، `helper.css`
* **برنامه‌های شروع دوزبانه** — کامنت‌های هر سه `program.py` کامل فارسی+انگلیسی
  شد؛ بالای هر شاخه‌ی منطق یک خط توضیح فارسی. کد بایت‌به‌بایت همان است
  (pyreader کامنت‌ها را دور می‌ریزد) و `_drive.html` پاس می‌شود.
  — `leagues/vacuum/{fs,u14,u19}/program.py`
* **قلاب تست `‎?headless=1‎`** — حلقه‌ی بازی را در تبی که فریم رندر نمی‌کند هم
  زنده نگه می‌دارد (rAF → setTimeout)؛ برای تست خودکار. — `index.html`
* مستندها به‌روز شدند: `README.md` (بخش «Learning from a match») و
  `leagues/vacuum/README.md` (چالش فنی، گزارش مسابقه، پل هلپر، جدول
  «Changing things safely»).

### پیش از این تاریخ

نسخه‌ی مستقل لیگ (موتور، فیزیک، سه رده، هلپر FS، نقشه‌ساز، ربات‌های آماده،
`RULES.md` و `CODING.md`) از قبل موجود بود؛ این پرونده از ۲۱ مرداد ۱۴۰۵ به بعد
را ثبت می‌کند.
