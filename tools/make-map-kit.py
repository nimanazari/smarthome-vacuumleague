# -*- coding: utf-8 -*-
"""
tools/make-map-kit.py — ONE file per competition map: the whole game + that map.

    python tools/make-map-kit.py            (all slots)
    python tools/make-map-kit.py 1          (one slot)

Writes organizer-only/maps/handout/SmartHomeLeague-MapN.zip: the TeamKit
(the complete game, no install) with mapN.json dropped in next to serve.bat,
so the team unzips, double-clicks serve.bat, and map N is already selected.
Run AFTER make-kits.py (it zips the TeamKit that is on disk).

فارسی: برای هر مپ یک فایل کامل — بازی + همان مپ. تیم باز می‌کند، serve.bat
را می‌زند، مپ خودش انتخاب شده است. هیچ نصبی، هیچ کپی‌ای.
"""
import io, json, os, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, 'TeamKit')
MAPS = os.path.join(ROOT, 'organizer-only', 'maps')
OUT = os.path.join(MAPS, 'handout')

README = u"""# Smart Home League — بازی + مپ %(n)d

این پوشه بازی کامل است و **مپ %(n)d (%(name)s)** از قبل داخلش است.

1. روی **index.html** دوبار کلیک کن (هیچ نصبی لازم نیست؛ `serve.bat` هم کار می‌کند).
2. رده‌ات را انتخاب کن.
3. مپ %(n)d خودش در منوی نقشه با 📁 انتخاب شده است. بازی کن.

اگر ویندوز نداری: روی مک «Smart Home League (Mac).command» را باز کن؛ روی
لینوکس `python3 -m http.server 8801` در همین پوشه.

The complete game with map %(n)d built in: double-click serve.bat, pick your
division, the map is already selected.
"""

def build(n):
    mp = os.path.join(MAPS, 'map%d' % n, 'map.json')
    if not os.path.isfile(mp):
        print('  map%d: no map.json, skipped' % n); return None
    m = json.loads(io.open(mp, encoding='utf-8').read())
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, 'SmartHomeLeague-Map%d.zip' % n)
    top = 'SmartHomeLeague-Map%d/' % n
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for r, _, fs in os.walk(KIT):
            for f in fs:
                p = os.path.join(r, f)
                rel = os.path.relpath(p, KIT).replace(os.sep, '/')
                if rel == 'offline-files.js':
                    # the double-click bundle: the map rides inside it too
                    txt = io.open(p, encoding='utf-8').read()
                    txt += 'window.SHL_FILES[%s] = %s;\n' % (json.dumps('map%d.json' % n), json.dumps(json.dumps(m, ensure_ascii=False)))
                    z.writestr(top + rel, txt)
                    continue
                z.write(p, top + rel)
        z.writestr(top + 'map%d.json' % n, json.dumps(m, ensure_ascii=False, indent=1))
        z.writestr(top + 'README-MAP.md', README % {'n': n, 'name': m.get('name', '')})
    print('  SmartHomeLeague-Map%d.zip  %.1f MB  (%s)' % (n, os.path.getsize(out) / 1e6, m.get('name', '')))
    return out

if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    if not os.path.isdir(KIT):
        raise SystemExit('no TeamKit/ — run tools/make-kits.py first')
    slots = [int(a) for a in sys.argv[1:]] or range(1, 6)
    for n in slots:
        build(n)
