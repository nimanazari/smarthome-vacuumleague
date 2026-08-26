# -*- coding: utf-8 -*-
"""
tools/app.py — the "Smart Home League.exe" launcher.

Double-click and the WHOLE game opens in its own app window:
  1. the game files (bundled inside the exe) are served on a local port
  2. Microsoft Edge opens in --app mode (no address bar, its own window)
  3. when the window closes, the exe exits with it

Everything runs in Edge's Chromium engine — the exact same engine the
browser version uses, so every line of the game works unchanged.

Build (from the project root):
  python -m PyInstaller --onefile --noconsole --name "Smart Home League" ^
     --add-data "..\\SmartHome-TeamPack;game" tools\\app.py

Test hook: run with  SHL_SERVER_ONLY=1  to start the server without a
window (prints the port to %TEMP%\\shl-port.txt) — used by automated tests.
"""
import http.server
import os
import socket
import socketserver
import subprocess
import sys
import tempfile
import threading
import webbrowser

# ---- where the game lives: bundled (PyInstaller) or the repo (dev) ----
if hasattr(sys, '_MEIPASS'):
    ROOT = os.path.join(sys._MEIPASS, 'game')
else:
    ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript', '.mjs': 'text/javascript',
        '.json': 'application/json', '.py': 'text/plain',
        '.woff2': 'font/woff2', '.wasm': 'application/wasm',
    }
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)
    def log_message(self, *a):
        pass                                    # a game, not a log file

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

def main():
    srv = Server(('127.0.0.1', 0), Handler)     # any free port
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = 'http://127.0.0.1:%d/index.html' % port

    if os.environ.get('SHL_SERVER_ONLY'):
        open(os.path.join(tempfile.gettempdir(), 'shl-port.txt'), 'w').write(str(port))
        threading.Event().wait()                # serve until killed

    # ---- open the app window: Edge --app (its own window, no address bar).
    # A private user-data-dir forces a NEW Edge process, so waiting on it
    # really waits for the window to close.
    edges = [
        os.path.expandvars(r'%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe'),
        os.path.expandvars(r'%ProgramFiles%\Microsoft\Edge\Application\msedge.exe'),
        os.path.expandvars(r'%LocalAppData%\Google\Chrome\Application\chrome.exe'),
        os.path.expandvars(r'%ProgramFiles%\Google\Chrome\Application\chrome.exe'),
    ]
    profile = os.path.join(tempfile.gettempdir(), 'shl-appwindow')
    for exe in edges:
        if os.path.isfile(exe):
            p = subprocess.Popen([exe, '--app=' + url,
                                  '--user-data-dir=' + profile,
                                  '--no-first-run', '--no-default-browser-check'])
            p.wait()                            # the window IS the app
            return
    webbrowser.open(url)                        # last resort: default browser
    threading.Event().wait()

if __name__ == '__main__':
    main()
