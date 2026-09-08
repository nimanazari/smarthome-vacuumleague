# -*- coding: utf-8 -*-
"""
tools/make-map-html.py — every competition map as ONE self-contained HTML.

    python tools/make-map-html.py            (release.py runs it before the kits)

For each organizer-only/maps/mapN/map.json it writes mapN/map.html next to it:
a single file, no dependencies, that DRAWS the floor plan (walls, furniture
with their names, rugs, the door, robot starts, room numbers), lists the map's
facts, and carries the map JSON inside it — with a «دانلود JSON» button and a
«▶ اجرا در بازی» button that hands the map to the game (works when the HTML
is opened from inside the kit / the site, next to index.html). Double-click
it anywhere and the plan still shows; print it and it is the referee's sheet.

فارسی: هر مپ مسابقه یک فایل HTML مستقل هم دارد — نقشه‌ی کشیده‌شده، مشخصات،
دانلود JSON و دکمه‌ی اجرا در بازی. بدون نیاز به هیچ فایل دیگری باز می‌شود.
"""
import io, json, os, glob, html, sys
try:
    sys.stdout.reconfigure(encoding='utf-8')     # a Windows console still prints the Persian names
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPS = os.path.join(ROOT, 'organizer-only', 'maps')

# item name (fa · en) + colour, the same palette the Map Maker paints with
ITEMS = {
    'sofa': ('مبل', 'sofa', '#4f5c70'), 'armchair': ('مبل تک', 'armchair', '#4f5c70'), 'chair': ('صندلی', 'chair', '#7a5230'),
    'tv': ('تلویزیون', 'TV', '#2f261d'), 'pouf': ('پاف', 'pouf', '#b3573f'), 'table': ('میز', 'table', '#6b4f38'),
    'dining': ('میز ناهار', 'dining', '#7a5230'), 'bookshelf': ('کتابخانه', 'bookshelf', '#5a4028'), 'fireplace': ('شومینه', 'fireplace', '#8a8078'),
    'piano': ('پیانو', 'piano', '#241f26'), 'aquarium': ('آکواریوم', 'aquarium', '#3a3f4a'), 'lamp': ('آباژور', 'lamp', '#caa25a'),
    'fridge': ('یخچال', 'fridge', '#c9ced6'), 'kitchen': ('کابینت', 'counter', '#8b6a48'), 'stove': ('اجاق', 'stove', '#3a3f46'),
    'washer': ('لباسشویی', 'washer', '#dfe3e8'), 'bathtub': ('وان', 'bathtub', '#eef1f3'), 'toilet': ('توالت', 'toilet', '#f0f2f4'),
    'bed': ('تخت', 'bed', '#5b7d9c'), 'shelf': ('کمد', 'wardrobe', '#54402d'), 'dresser': ('دراور', 'dresser', '#6b533a'),
    'desk': ('میز تحریر', 'desk', '#5f4a36'), 'treadmill': ('تردمیل', 'treadmill', '#2e3238'), 'plant': ('گلدان', 'plant', '#3f8f4f'),
    'cactus': ('کاکتوس', 'cactus', '#3f8f4f'), 'palm': ('پالم', 'palm', '#3f9e5f'), 'trash': ('سطل', 'bin', '#5b6675'),
    'dock': ('داک شارژ', 'dock', '#2fd08a'), 'dump': ('تخلیه', 'dump', '#f4f7fb'), 'box': ('کارتن', 'box', '#b08d57'),
    'bench': ('نیمکت', 'bench', '#8a5a2e'), 'doghouse': ('لانه سگ', 'doghouse', '#8a5a2e'), 'cattree': ('درخت گربه', 'cat tree', '#b9a58e'),
    'petbowl': ('ظرف غذا', 'pet bowl', '#4f5c70'), 'door': ('در', 'door', '#7a5230'), 'sconce': ('چراغ', 'sconce', '#3a4356'),
    'column': ('ستون', 'column', '#9aa3b0'), 'window': ('پنجره', 'window', '#dfe8f2'),
}
RUGS = {'green': ('فرش سبز — نیم‌سرعت', '#2f7d4a'), 'purple': ('فرش نشانه', '#8a4fd8'), 'orange': ('فرش نشانه', '#e08a1e'),
        'cyan': ('فرش نشانه', '#22b8d4'), 'wet': ('چاله‌ی آب', '#2f7fc4')}
ROOM_FA = {'kitchen': 'آشپزخانه', 'bathroom': 'سرویس'}

def esc(s):
    return html.escape(str(s), quote=True)

def svg_of(m):
    t = float(m.get('tileSize') or 0.625)
    W = m['cols'] * t; H = m['rows'] * t
    S = 60.0                                   # px per metre
    pad = 24
    def X(x): return pad + x * S
    def Y(y): return pad + (H - y) * S         # the game's y goes UP; SVG's goes down
    out = []
    out.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="100%%" style="max-width:900px;background:#f6f7f9;border-radius:12px;direction:ltr">'
               % (W * S + pad * 2, H * S + pad * 2))
    # floor + grid
    out.append('<rect x="%g" y="%g" width="%g" height="%g" fill="#ffffff" stroke="#2b2f36" stroke-width="6"/>' % (X(0), Y(H), W * S, H * S))
    for i in range(m['cols'] + 1):
        out.append('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="%s" stroke-width="1"/>' % (X(i * t), Y(0), X(i * t), Y(H), '#c9ced6' if i % 4 else '#9aa3b0'))
    for j in range(m['rows'] + 1):
        out.append('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="%s" stroke-width="1"/>' % (X(0), Y(j * t), X(W), Y(j * t), '#c9ced6' if j % 4 else '#9aa3b0'))
    # rooms (numbers + names, faint)
    for r in m.get('rooms') or []:
        x1, y1, x2, y2 = r['x1'], r['y1'], r['x2'], r['y2']
        out.append('<rect x="%g" y="%g" width="%g" height="%g" fill="#4d8bff" fill-opacity="0.05" stroke="#4d8bff" stroke-opacity="0.35" stroke-dasharray="6 4"/>'
                   % (X(x1), Y(y2), (x2 - x1) * S, (y2 - y1) * S))
        name = str(r.get('name') or '')
        fa = ROOM_FA.get(name.split(' ')[0], 'خواب' if 'bedroom' in name else name)
        out.append('<text x="%g" y="%g" font-size="15" fill="#4d8bff" font-family="Vazirmatn,Tahoma,sans-serif" font-weight="700">room %s · %s%s</text>'
                   % (X(x1) + 8, Y(y2) + 20, r['id'], fa, ' (در)' if 'door' in name else ''))
    # rugs
    for g in m.get('rugs') or []:
        col = (RUGS.get(g.get('kind'), ('', '#2f7d4a'))[1]) if not g.get('color') else g['color']
        out.append('<rect x="%g" y="%g" width="%g" height="%g" fill="%s" fill-opacity="0.75" rx="3"/>'
                   % (X(g['x'] - g['w'] / 2), Y(g['y'] + g['d'] / 2), g['w'] * S, g['d'] * S, col))
    # walls
    for w in m.get('walls') or []:
        out.append('<rect x="%g" y="%g" width="%g" height="%g" fill="#2b2f36"/>'
                   % (X(w['x'] - w['w'] / 2), Y(w['y'] + w['d'] / 2), w['w'] * S, w['d'] * S))
    # furniture
    doors_open = bool(m.get('doorsOpen'))
    for o in m.get('objects') or []:
        k = o.get('t'); rot = int(o.get('rot') or 0) % 2
        w = o['d'] if rot else o['w']; d = o['w'] if rot else o['d']
        fa, en, col = ITEMS.get(k, (k, k, '#888888'))
        if k == 'door' and doors_open:
            continue                          # the map says: no door at all
        if k == 'window':
            continue
        col = o.get('color') or col
        dash = ' stroke-dasharray="4 3"' if k in ('dock', 'dump', 'sconce') else ''
        out.append('<rect x="%g" y="%g" width="%g" height="%g" fill="%s" fill-opacity="0.9" stroke="#1d2026" stroke-width="1.2" rx="3"%s/>'
                   % (X(o['x'] - w / 2), Y(o['y'] + d / 2), w * S, d * S, col, dash))
        if w * S > 34 and d * S > 16:
            light = col.lower() in ('#c9ced6', '#dfe3e8', '#eef1f3', '#f0f2f4', '#f4f7fb', '#caa25a', '#2fd08a', '#b9a58e')
            out.append('<text x="%g" y="%g" font-size="11" text-anchor="middle" fill="%s" font-family="Vazirmatn,Tahoma,sans-serif">%s</text>'
                       % (X(o['x']), Y(o['y']) + 4, '#1d2026' if light else '#ffffff', esc(fa)))
    # spawns
    sp = m.get('spawns') or {}
    for k, col, lab in (('red', '#e5484d', 'R'), ('blue', '#3b82f6', 'B')):
        p = sp.get(k)
        if p:
            out.append('<circle cx="%g" cy="%g" r="13" fill="%s" stroke="#fff" stroke-width="2"/><text x="%g" y="%g" font-size="13" text-anchor="middle" fill="#fff" font-weight="700">%s</text>'
                       % (X(p['x']), Y(p['y']), col, X(p['x']), Y(p['y']) + 5, lab))
    for k, lab in (('cat', '🐱'), ('dog', '🐶')):
        p = sp.get(k)
        if p and p.get('on') is not False:
            out.append('<text x="%g" y="%g" font-size="18" text-anchor="middle">%s</text>' % (X(p['x']), Y(p['y']) + 6, lab))
    out.append('</svg>')
    return '\n'.join(out)

def page(slot, m):
    name = m.get('name') or ('map %d' % slot)
    t = float(m.get('tileSize') or 0.625)
    doors = [o for o in (m.get('objects') or []) if o.get('t') == 'door']
    door_room = next((r for r in (m.get('rooms') or []) if 'door' in str(r.get('name', ''))), None)
    facts = [
        ('اندازه · size', '%d × %d کاشی · %.2f × %.2f m' % (m['cols'], m['rows'], m['cols'] * t, m['rows'] * t)),
        ('درها · doors', 'همه باز (بدون در) · all open' if m.get('doorsOpen') else ('%d در هل‌دادنی · push-open door%s' % (len(doors), '' if len(doors) == 1 else 's')
                                                                                   + (' — room %d' % door_room['id'] if door_room else ''))),
        ('اتاق‌ها · rooms', ' · '.join('%d = %s' % (r['id'], r['name']) for r in (m.get('rooms') or [])) or '—'),
        ('فرش‌ها · rugs', ', '.join('%s×%s' % (k, n) for k, n in sorted({}.items()))),
        ('حیوانات · pets', ' '.join(x for x, ok in (('🐱', (m.get('spawns', {}).get('cat') or {}).get('on') is not False), ('🐶', (m.get('spawns', {}).get('dog') or {}).get('on') is not False)) if ok) or 'هیچ'),
    ]
    rugs = {}
    for g in m.get('rugs') or []:
        rugs[g.get('kind') or 'rug'] = rugs.get(g.get('kind') or 'rug', 0) + 1
    facts[3] = ('فرش‌ها · rugs', ' · '.join('%s ×%d' % (RUGS.get(k, (k,))[0], n) for k, n in rugs.items()) or '—')
    legend = ''.join('<span class="lg"><i style="background:%s"></i>%s · %s</span>' % (c, esc(fa), esc(en))
                     for fa, en, c in sorted({ITEMS.get(o.get('t'), (o.get('t'), o.get('t'), '#888'))
                                              for o in (m.get('objects') or []) if o.get('t') not in ('window',)}, key=lambda x: x[1]))
    data = json.dumps(m, ensure_ascii=False).replace('</', '<\\/')
    return '''<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<style>
  body { margin: 0; background: #0f1319; color: #e8ecf2; font-family: Vazirmatn, Tahoma, "Segoe UI", sans-serif; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 22px 18px 40px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #98a2b3; font-size: 13px; margin-bottom: 14px; }
  .bar { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 16px; }
  button, a.btn { font: inherit; font-size: 14px; padding: 9px 14px; border-radius: 10px; border: 1px solid #2b3340; background: #182030; color: #e8ecf2; cursor: pointer; text-decoration: none; }
  button.primary { background: #2f6bff; border-color: #2f6bff; color: #fff; font-weight: 700; }
  table { border-collapse: collapse; font-size: 13px; margin: 10px 0 14px; width: 100%%; }
  td { padding: 6px 8px; border-bottom: 1px solid #222a36; vertical-align: top; }
  td:first-child { color: #98a2b3; white-space: nowrap; width: 130px; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: #c3cad6; margin-top: 12px; }
  .lg i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-inline-end: 5px; vertical-align: -1px; border: 1px solid #0006; }
  .note { font-size: 12px; color: #98a2b3; margin-top: 14px; line-height: 1.8; }
  @media print { body { background: #fff; color: #000; } .bar, .note { display: none; } .wrap { padding: 0; } td:first-child { color: #444; } .legend { color: #222; } }
</style>
</head>
<body>
<div class="wrap">
  <h1>🏁 %(title)s</h1>
  <div class="sub">مپ %(slot)d · لیگ جاروبرقی هوشمند · Smart Home League — competition map %(slot)d</div>
  <div class="bar">
    <button class="primary" id="play">▶ اجرا در بازی · play in the game</button>
    <button id="dl">⬇ دانلود JSON · download map.json</button>
    <button onclick="window.print()">🖨 چاپ · print</button>
  </div>
  %(svg)s
  <table>%(facts)s</table>
  <div class="legend">%(legend)s</div>
  <div class="note" id="note">
    «اجرا در بازی» وقتی کار می‌کند که این فایل از داخل کیت (کنار index.html، از طریق serve.bat) یا از روی سایت باز شده باشد؛
    بازی با همین نقشه بالا می‌آید. اگر فایل را جدا باز کرده‌ای، JSON را دانلود کن و در بازی «لود فایل مپ» را بزن.<br>
    <small>“Play in the game” works when this file is opened from inside the kit (served next to index.html) or on the site; otherwise download the JSON and load it in the game.</small>
  </div>
</div>
<script id="map" type="application/json">%(data)s</script>
<script>
(function () {
  var map = JSON.parse(document.getElementById('map').textContent);
  document.getElementById('dl').onclick = function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(map, null, 1)], { type: 'application/json' }));
    a.download = 'map%(slot)d.json'; document.body.appendChild(a); a.click(); a.remove();
  };
  document.getElementById('play').onclick = function () {
    try { localStorage.setItem('shl_play_map', JSON.stringify(map)); } catch (e) {}
    // the game lives three folders up (organizer-only/maps/mapN/ -> the kit root)
    var here = location.pathname.replace(/\\/[^/]*$/, '/');
    var root = here.replace(/organizer-only\\/maps\\/[^/]+\\/$/, '');
    if (location.protocol === 'file:') { alert('این فایل را از داخل کیت (serve.bat) باز کن، یا JSON را دانلود کن و در بازی «لود فایل مپ» بزن.'); return; }
    window.open(root + 'index.html?playmap=1&league=' + encodeURIComponent(map.league || 'vacuum'), '_blank');
  };
})();
</script>
</body>
</html>
''' % dict(title=esc(name), slot=slot, svg=svg_of(m), data=data, legend=legend,
           facts=''.join('<tr><td>%s</td><td>%s</td></tr>' % (esc(k), esc(v)) for k, v in facts))

def main():
    n = 0
    for d in sorted(glob.glob(os.path.join(MAPS, 'map*'))):
        p = os.path.join(d, 'map.json')
        if not os.path.isfile(p):
            continue
        try:
            slot = int(os.path.basename(d)[3:])
        except ValueError:
            continue
        m = json.loads(io.open(p, encoding='utf-8').read())
        io.open(os.path.join(d, 'map.html'), 'w', encoding='utf-8').write(page(slot, m))
        n += 1
        print('  map%d/map.html  <-  %s' % (slot, m.get('name', '')))
    # an index page listing all of them
    rows = []
    for d in sorted(glob.glob(os.path.join(MAPS, 'map*'))):
        p = os.path.join(d, 'map.json')
        if os.path.isfile(p):
            m = json.loads(io.open(p, encoding='utf-8').read())
            b = os.path.basename(d)
            rows.append('<li><a href="%s/map.html">%s</a> — <a href="%s/map.json" download>JSON</a>%s</li>'
                        % (b, esc(m.get('name', b)), b, ' · <b>درها باز</b>' if m.get('doorsOpen') else ''))
    io.open(os.path.join(MAPS, 'index.html'), 'w', encoding='utf-8').write(
        '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>نقشه‌های مسابقه</title>'
        '<body style="font-family:Vazirmatn,Tahoma,sans-serif;background:#0f1319;color:#e8ecf2;padding:30px">'
        '<h1>🏁 نقشه‌های مسابقه · competition maps</h1><ul style="line-height:2.2;font-size:16px">' + ''.join(rows) + '</ul>'
        '<p style="color:#98a2b3;font-size:13px">هر نقشه یک HTML مستقل است: باز کن، ببین، چاپ کن، JSON بگیر یا مستقیم در بازی اجرا کن.</p></body></html>')
    print('map HTML pages:', n)

if __name__ == '__main__':
    main()
