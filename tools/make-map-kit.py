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
import glob, io, json, os, sys, zipfile

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
    # These zips are TRACKED in git, so they must be byte-identical when the game
    # and the map are. A plain z.write() stores each file's mtime, which made all
    # six rebuild "changed" on every release and manufactured an empty commit each
    # time. Fixed timestamp, fixed mode, sorted walk: same input, same bytes.
    FIXED_DATE = (1980, 1, 1, 0, 0, 0)
    def entry(name):
        zi = zipfile.ZipInfo(name, date_time=FIXED_DATE)
        zi.compress_type = zipfile.ZIP_DEFLATED
        zi.external_attr = (0o100644 << 16)
        return zi
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for r, ds, fs in os.walk(KIT):
            ds.sort()
            for f in sorted(fs):
                p = os.path.join(r, f)
                rel = os.path.relpath(p, KIT).replace(os.sep, '/')
                if rel == 'offline-files.js':
                    # the double-click bundle: the map rides inside it too
                    txt = io.open(p, encoding='utf-8').read()
                    txt += 'window.SHL_FILES[%s] = %s;\n' % (json.dumps('map%d.json' % n), json.dumps(json.dumps(m, ensure_ascii=False)))
                    z.writestr(entry(top + rel), txt)
                    continue
                with io.open(p, 'rb') as fh:
                    z.writestr(entry(top + rel), fh.read())
        z.writestr(entry(top + 'map%d.json' % n), json.dumps(m, ensure_ascii=False, indent=1))
        z.writestr(entry(top + 'README-MAP.md'), README % {'n': n, 'name': m.get('name', '')})
    print('  SmartHomeLeague-Map%d.zip  %.1f MB  (%s)' % (n, os.path.getsize(out) / 1e6, m.get('name', '')))
    return out

if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    if not os.path.isdir(KIT):
        raise SystemExit('no TeamKit/ — run tools/make-kits.py first')
    slots = [int(a) for a in sys.argv[1:]] or sorted(
        int(os.path.basename(d)[3:]) for d in glob.glob(os.path.join(MAPS, 'map*'))
        if os.path.basename(d)[3:].isdigit() and os.path.isfile(os.path.join(d, 'map.json')))
    for n in slots:
        build(n)
