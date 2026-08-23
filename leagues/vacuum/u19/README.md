# U19 (ages 14–19) · زیر ۱۹ سال

`rules.js` (switches), `program.py` (battery-aware starter).

## Sensors · سنسورها

U19 has **no fixed kit file**: the team builds its own robot in
`🔧 Robot` (`builder: true`), picking from the full parts catalogue —
side and rear eyes, compass, GPS, and more. What the code can read is
whatever the team fitted, plus:
کیت ثابت ندارد: تیم ربات را خودش می‌سازد — چشم بغل/عقب، قطب‌نما، GPS
و بقیه‌ی قطعات. علاوه بر قطعات:

| python name | what it is · چیست |
|---|---|
| `x`, `y`, `heading`, `goto(x,y)`, `atgoal`, `distto`, `angleto` | GPS navigation (if fitted) · ناوبری |
| `battery`, `dockx`, `docky` | the battery + the charging pad · باتری و پد شارژ |
| `dust`, `dustmax`, `dustfull`, `dumpx`, `dumpy` | the dust bin (1P) · سطل خاک |
| `room`, `clean1..clean5` | from the HOUSE · از خودِ خانه |

## Helper · هلپر

**📍 Route** — `../helper3/route.html?league=u19`: tap the real house map,
drop numbered waypoints; the page plans doorway via-points itself (A* over
the walls, then smoothed) and writes a goto()/atgoal state machine — plus a
battery guard whose paths to the charging pad are pre-planned per route
node, so the robot never dies behind a wall. The editor remains the main
instrument; the Route page teaches POSITION.
نقشه را لمس کن، نقطه بگذار — عبور از درها و مسیرهای امنِ رسیدن به شارژر را
خودِ صفحه با A* طراحی می‌کند و خروجی، ماشین حالت goto/atgoal است. درسِ
این رده «موقعیت» است؛ ادیتور همچنان ابزار اصلی است.
