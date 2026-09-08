# -*- coding: utf-8 -*-
"""
tools/mapserver.py — the ORGANISER's local server: the game + map saving.

    python tools/mapserver.py            (serve.bat runs this when it exists)

Serves the game folder on http://localhost:8801/ exactly like
`python -m http.server`, and adds what the plain server cannot do — the
SAME small API the league site (smarthomeleague.ir) speaks, so the Map
Maker's «🏁 نقشه‌های مسابقه» panel works identically in both places:

    GET  /api/maps           -> { maps: [the ON slots, each map carrying compSlot],
                                 slots: [{slot, name, on}], writable: true, admin: true }
    GET  /api/maps?all=1     -> ...plus all: [{slot, name, on, map}] (OFF ones too)
    POST /api/maps/slot      -> { slot: 1..5, map?: {...}, on?: true|false }
                                writes organizer-only/maps/mapN/map.json and/or
                                flips the ON/OFF switch (an empty file named OFF)

The teams' kit has neither tools/ nor organizer-only/, so for them /api/maps
404s and the game lists only its built-in houses.

فارسی: سرور محلی برگزارکننده — بازی را سرو می‌کند و نقشه‌های مسابقه
(organizer-only/maps/map1..5/map.json) را برای مپ‌ساز می‌خواند و ذخیره می‌کند.
"""
import io, json, os, sys, webbrowser, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPS = os.path.join(ROOT, 'organizer-only', 'maps')
PORT = int(os.environ.get('SHL_PORT') or 8801)
SLOTS = 5

def slot_dir(n):
    return os.path.join(MAPS, 'map%d' % n)

def read_slot(n):
    p = os.path.join(slot_dir(n), 'map.json')
    if not os.path.isfile(p):
        return None
    try:
        m = json.loads(io.open(p, encoding='utf-8').read())
    except Exception:
        return None
    if not isinstance(m, dict):
        return None
    on = not os.path.isfile(os.path.join(slot_dir(n), 'OFF'))
    m = dict(m, compSlot=n)
    return {'slot': n, 'name': m.get('name') or ('map %d' % n), 'on': on, 'map': m}

def listing(with_all=False):
    items = [it for it in (read_slot(n) for n in range(1, SLOTS + 1)) if it]
    out = {
        'maps': [{'name': it['name'], 'map': it['map']} for it in items if it['on']],
        'slots': [{'slot': it['slot'], 'name': it['name'], 'on': it['on']} for it in items],
        'writable': True, 'admin': True,
    }
    if with_all:
        out['all'] = items
    return out

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_GET(self):
        path, _, q = self.path.partition('?')
        if path == '/api/maps':
            return self._json(200, listing('all=1' in q))
        return super().do_GET()

    def do_POST(self):
        path = self.path.split('?')[0]
        if path not in ('/api/maps/slot', '/api/maps'):
            return self._json(404, {'error': 'not found'})
        try:
            n = int(self.headers.get('Content-Length') or 0)
            body = json.loads(self.rfile.read(n).decode('utf-8'))
            slot = int(body.get('slot') or 0)
            if not (1 <= slot <= SLOTS):
                return self._json(400, {'error': 'slot must be 1..%d' % SLOTS})
            d = slot_dir(slot)
            os.makedirs(d, exist_ok=True)
            p = os.path.join(d, 'map.json')
            m = body.get('map')
            if m is not None:
                if not isinstance(m, dict) or not m.get('cols') or not m.get('rows'):
                    return self._json(400, {'error': 'invalid map data'})
                m = dict(m)
                m.pop('compSlot', None)
                # keep one backup of what was there — a wrong save is one rename away
                if os.path.isfile(p):
                    try:
                        os.replace(p, p + '.bak')
                    except OSError:
                        pass
                io.open(p, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1))
            # the ON/OFF switch: an empty file named OFF in the folder hides the map
            if 'on' in body:
                off = os.path.join(d, 'OFF')
                if body['on']:
                    if os.path.isfile(off):
                        os.remove(off)
                else:
                    io.open(off, 'w').write('')
            return self._json(200, {'ok': True, 'slot': slot, 'file': os.path.relpath(p, ROOT).replace(os.sep, '/')})
        except Exception as ex:
            return self._json(500, {'error': str(ex)[:200]})

if __name__ == '__main__':
    os.makedirs(MAPS, exist_ok=True)
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), H)
    url = 'http://localhost:%d/' % PORT
    print('Smart Home League (organiser) on', url, '- maps in', MAPS)
    if '--no-browser' not in sys.argv:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
