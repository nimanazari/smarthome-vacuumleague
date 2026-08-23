# U14 (ages 11–14) · زیر ۱۴ سال

`rules.js` (switches), `kit.js` (sensor rig), `program.py` (starter).

## Sensors · سنسورها (`kit.js` → `VacuumU14Kit`)

Everything FS has **plus the compass**:
همه‌ی حس‌های FS **به‌علاوه‌ی قطب‌نما**:

| python name | what it is · چیست |
|---|---|
| `frontleft` `front` `frontright` | three distance eyes, cm · سه چشم فاصله |
| `bumperfront` / `bumperback` | the ring's two halves · دو نیمه‌ی سپر |
| `color` | the floor just ahead · رنگ کف جلو |
| `heading` | the compass, 0..359° (0 = right, 90 = up, 180 = left, 270 = down) · قطب‌نما |
| `room` | which numbered room I am in (0 hall · 1 kitchen · 2/3/4 bedrooms · 5 bathroom) · شماره‌ی اتاق |
| `clean1..clean5` | that room's clean-%, for ME · درصد تمیزی هر اتاق برای خودم |

The robot is team-built (`🔧 Robot`); GPS / `goto()` are still U19's.
ربات را خود تیم می‌سازد؛ GPS و goto هنوز مال U19 است.

## Helper · هلپر

**🤖 AI helper** — `../helper/helper.html?league=u14`: FS's page plus the
compass / room / clean-% chips, the absolute **Turn-to-°** move, and
3-move exit plans ("bedroom 1 is 80 % mine — walk out").
همان صفحه‌ی FS به‌علاوه‌ی قطب‌نما، اتاق و درصد تمیزی، حرکت «چرخش تا °»
و پلان سه‌حرکتیِ خروج از اتاق.
