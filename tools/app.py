# -*- coding: utf-8 -*-
"""
tools/app.py — the "Smart Home League.exe" launcher (v2, hardened).

Double-click and the WHOLE game opens in its own app window:
  1. the game files (bundled inside the exe) are served on 127.0.0.1
  2. the server is HEALTH-CHECKED before any window opens
  3. Edge/Chrome opens in --app mode with PROXY DISABLED for this window
     (school proxies/PAC files love to eat 127.0.0.1 — not on our watch)
  4. if the app window dies young, the server stays up and the default
     browser is opened instead — the game must reach the screen
  5. everything is logged to  %TEMP%\\shl-log.txt  for easy diagnosis

Build (from the project root):
  python -m PyInstaller --onefile --noconsole --name "Smart Home League" ^
     --add-data "..\\SmartHome-TeamPack;game" tools\\app.py

Test hook:  SHL_SERVER_ONLY=1  starts only the server and writes the
port to %TEMP%\\shl-port.txt (used by automated tests).
"""
import http.server
import os
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
import webbrowser

LOG = os.path.join(tempfile.gettempdir(), 'shl-log.txt')
def log(msg):
    try:
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(time.strftime('[%H:%M:%S] ') + msg + '\n')
    except OSError:
        pass

# ---- where the game lives: bundled (PyInstaller) or the repo (dev) ----
if hasattr(sys, '_MEIPASS'):
    ROOT = os.path.join(sys._MEIPASS, 'game')
else:
    ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript', '.mjs': 'text/javascript',
        '.json': 'application/json', '.py': 'text/plain; charset=utf-8',
        '.woff2': 'font/woff2', '.wasm': 'application/wasm',
    }
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)
    def log_message(self, *a):
        pass

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

def start_server():
    # a friendly port first, then whatever is free
    for port in (8000, 8080, 8801, 0):
        try:
            srv = Server(('127.0.0.1', port), Handler)
            break
        except OSError:
            continue
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return port

def healthy(url, tries=20):
    for _ in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=1) as r:
                if r.status == 200:
                    return True
        except OSError:
            time.sleep(0.25)
    return False

def find_browser():
    cands = [
        r'%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe',
        r'%ProgramFiles%\Microsoft\Edge\Application\msedge.exe',
        r'%LocalAppData%\Microsoft\Edge\Application\msedge.exe',
        r'%ProgramFiles%\Google\Chrome\Application\chrome.exe',
        r'%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe',
        r'%LocalAppData%\Google\Chrome\Application\chrome.exe',
        r'%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe',
    ]
    for c in cands:
        p = os.path.expandvars(c)
        if os.path.isfile(p):
            return p
    return None

def main():
    log('--- Smart Home League starting ---')
    log('game root: ' + ROOT + ' (exists: %s)' % os.path.isdir(ROOT))
    port = start_server()
    url = 'http://127.0.0.1:%d/index.html' % port
    log('server on port %d' % port)

    if os.environ.get('SHL_SERVER_ONLY'):
        open(os.path.join(tempfile.gettempdir(), 'shl-port.txt'), 'w').write(str(port))
        log('server-only mode')
        threading.Event().wait()

    if not healthy(url):
        log('SERVER NEVER ANSWERED — giving up on the app window')
        webbrowser.open(url)
        threading.Event().wait()

    log('health check OK')
    exe = find_browser()
    if exe:
        log('browser: ' + exe)
        profile = os.path.join(tempfile.gettempdir(), 'shl-appwindow')
        p = subprocess.Popen([
            exe, '--app=' + url,
            '--user-data-dir=' + profile,
            # the school proxy shall not eat localhost:
            '--proxy-server=direct://', '--proxy-bypass-list=<-loopback>',
            '--no-first-run', '--no-default-browser-check',
            '--disable-background-networking',
        ])
        # a window that dies young means something interfered — do NOT take
        # the game down with it; fall through to the default browser
        t0 = time.time()
        p.wait()
        lived = time.time() - t0
        log('app window closed after %.1f s' % lived)
        if lived > 5:
            return                              # a real session — done
        log('window died young — falling back to the default browser')
    else:
        log('no Edge/Chrome found — using the default browser')

    webbrowser.open(url)
    log('default browser opened; serving until this process is closed')
    threading.Event().wait()

if __name__ == '__main__':
    main()
