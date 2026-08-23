# U19 (ages 14–19) · زیر ۱۹ سال

`rules.js` (switches), `program.py` (battery-aware starter).

## Sensors · سنسورها

U19 drives the **ready-made classic rig** (`builder: false`): seven
distance eyes all around, bumper, colour sensor, compass and GPS —
nobody builds a robot; the code is the whole game. The rig reads:
ربات آماده است: هفت چشم فاصله دورتادور، بامپر، سنسور رنگ، قطب‌نما و
GPS — کسی ربات نمی‌سازد؛ همه‌چیز کدِ توست. این‌ها خوانده می‌شوند:

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
