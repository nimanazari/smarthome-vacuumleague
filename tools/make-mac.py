# -*- coding: utf-8 -*-
"""
tools/make-mac.py — build the SINGLE-FILE macOS launcher.

Output: "Smart Home League (Mac).command" — one file, nothing else.
The whole (minified) game rides inside it as a base64 zip payload.
On double-click it:
  1. decodes the payload into a private temp dir (cleaned on exit)
  2. serves the game FROM THE ZIP IN MEMORY on 127.0.0.1
  3. opens a Chrome/Edge app window (proxy disabled) or the default browser
  4. removes the temp dir when the window closes

The player only ever sees one .command file — the same bar as the
Windows exe. Run AFTER tools/protect.py.
"""
import base64
import io
import os
import zipfile

DOCS = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(DOCS, 'SmartHome-Protected')
OUT = os.path.join(DOCS, 'Smart Home League', 'Mac', 'Smart Home League (Mac).command')

SERVE_PY = r'''
import base64, http.server, io, mimetypes, os, socketserver, subprocess, sys, tempfile, threading, time, urllib.request, webbrowser, zipfile

zf = zipfile.ZipFile(sys.argv[1])
FILES = {'/' + n: zf.read(n) for n in zf.namelist() if not n.endswith('/')}
MIME = {'.js': 'text/javascript', '.json': 'application/json',
        '.py': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
        '.html': 'text/html; charset=utf-8'}

class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        p = self.path.split('?')[0].split('#')[0]
        if p.endswith('/'): p += 'index.html'
        b = FILES.get(p)
        if b is None:
            self.send_response(404); self.end_headers(); return
        e = os.path.splitext(p)[1].lower()
        c = MIME.get(e) or mimetypes.guess_type(p)[0] or 'application/octet-stream'
        self.send_response(200)
        self.send_header('Content-Type', c)
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)
    def log_message(self, *a): pass

class S(socketserver.ThreadingTCPServer):
    allow_reuse_address = True; daemon_threads = True

srv = None
for port in (8000, 8080, 8801, 0):
    try:
        srv = S(('127.0.0.1', port), H); break
    except OSError:
        continue
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = 'http://127.0.0.1:%d/index.html' % port
for _ in range(20):
    try:
        if urllib.request.urlopen(url, timeout=1).status == 200: break
    except OSError:
        time.sleep(0.25)

browsers = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser']
exe = next((b for b in browsers if os.path.isfile(b)), None)
if exe:
    prof = os.path.join(tempfile.gettempdir(), 'shl-appwindow')
    p = subprocess.Popen([exe, '--app=' + url, '--user-data-dir=' + prof,
                          '--proxy-server=direct://', '--proxy-bypass-list=<-loopback>',
                          '--no-first-run', '--no-default-browser-check'])
    t0 = time.time(); p.wait()
    if time.time() - t0 > 5: sys.exit(0)
webbrowser.open(url)
print('Smart Home League is running at ' + url)
print('Close this window to stop the game.')
threading.Event().wait()
'''

SHELL = '''#!/bin/bash
# ============================================================
#  Smart Home League - macOS (single-file edition)
#  Double-click me. First time: right-click -> Open -> Open.
#  If python3 is missing, macOS offers to install it - accept,
#  then double-click me again.
# ============================================================
PY="$(command -v python3 || true)"
if [ -z "$PY" ]; then
  echo "python3 was not found. Run once:  xcode-select --install"
  read -r -p "Press Enter to close."
  exit 1
fi
D="${TMPDIR:-/tmp}/shl-$$"
mkdir -p "$D"
trap 'kill $(jobs -p) 2>/dev/null; rm -rf "$D"' EXIT
N=$(awk '/^__PAYLOAD__$/{print NR+1; exit}' "$0")
tail -n +"$N" "$0" | "$PY" -c 'import sys,base64;sys.stdout.buffer.write(base64.b64decode(sys.stdin.read()))' > "$D/pack.zip"
"$PY" -c "import zipfile;zipfile.ZipFile('$D/pack.zip').extract('__serve.py','$D')"
"$PY" "$D/__serve.py" "$D/pack.zip"
exit 0
__PAYLOAD__
'''

def main():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('__serve.py', SERVE_PY)
        for root, _dirs, files in os.walk(SRC):
            for f in files:
                if f.endswith('.command'):
                    continue
                p = os.path.join(root, f)
                z.write(p, os.path.relpath(p, SRC).replace('\\', '/'))
    payload = base64.b64encode(buf.getvalue()).decode('ascii')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='ascii', newline='\n') as f:
        f.write(SHELL)
        for i in range(0, len(payload), 120):
            f.write(payload[i:i + 120] + '\n')
    print('wrote', OUT, '(%.1f MB)' % (os.path.getsize(OUT) / 1e6))

if __name__ == '__main__':
    main()
