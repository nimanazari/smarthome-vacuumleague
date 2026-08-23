# FS — First Step (ages 8–11) · فرست استپ (۸ تا ۱۱ سال)

Everything this division IS lives in this folder: its switches
(`rules.js`), its sensor rig (`kit.js`) and its starter program
(`program.py`). The helpers it uses are league modules next door.
هرچه این رده هست همین‌جاست: قوانین، کیت سنسور و برنامه‌ی شروع.

## Sensors · سنسورها (`kit.js` → `VacuumFsKit`)

| python name | what it is · چیست |
|---|---|
| `frontleft` `front` `frontright` | three distance eyes, forward (±30°), cm · سه چشم فاصله رو به جلو |
| `bumperfront` / `bumperback` | the ring's two halves · دو نیمه‌ی حلقه‌ی سپر |
| `color` | the floor just ahead · رنگ کفِ جلوی ربات |
| `room`, `clean1..clean5` | from the HOUSE on rooms maps · از خودِ خانه، روی نقشه‌ی اتاق‌دار |

No side/rear eyes, no compass, no GPS — those start at U14/U19.
چشم بغل/عقب، قطب‌نما و GPS ندارد — آن‌ها از U14 و U19 شروع می‌شوند.

## Helpers · هلپرها

FS is the only division with **two** helpers, both league modules:
تنها رده‌ای که **دو** هلپر دارد:

1. **🤖 AI helper** — `../helper/helper.html?league=fs`: tap a sensor,
   answer "which way do I go?", get real Python.
   سنسور بزن، جواب بده، پایتون بگیر.
2. **🧩 Blocks helper** — `../helper2/blocks.html?league=fs`: stack
   Scratch-style blocks into if-rules; the SAME rules file as helper 1,
   so the two pages convert into each other freely; exports Python and
   a blocks (.json) file. بلاک‌ها را مثل اسکرچ بچین؛ همان قانون‌های
   هلپر ۱ است و دوطرفه تبدیل می‌شود؛ خروجی پایتون و فایل بلاکی.
