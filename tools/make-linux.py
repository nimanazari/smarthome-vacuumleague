# -*- coding: utf-8 -*-
"""
tools/make-linux.py — build the SINGLE-FILE Linux launcher.

Output: "Smart Home League (Linux).sh" — one file, nothing else, exactly the
same idea as the macOS build: the whole minified game rides inside it as a
base64 zip and is served from memory on 127.0.0.1.

WHY A SCRIPT AND NOT A BINARY
PyInstaller does not cross-compile: an ELF binary has to be built ON Linux,
and this project is built on Windows. But every desktop Linux ships python3,
which is the only thing this needs — so a shell script is not a lesser
option here, it is the one that actually reaches every distribution without
a build machine per distro.

The serving half is IMPORTED from make-mac.py rather than copied, so the two
launchers cannot drift apart; only the part that finds a browser differs,
because that genuinely differs between the two systems.

Run AFTER tools/protect.py.
"""
import base64
import importlib.util
import io
import os
import re
import zipfile

TOOLS = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.dirname(os.path.dirname(TOOLS))
SRC = os.path.join(DOCS, 'SmartHome-Protected')
OUT = os.path.join(DOCS, 'Smart Home League', 'Linux', 'Smart Home League (Linux).sh')


def _load_mac():
    """make-mac.py has a hyphen in its name, so it cannot be imported by name."""
    spec = importlib.util.spec_from_file_location('shl_make_mac',
                                                  os.path.join(TOOLS, 'make-mac.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


MAC = _load_mac()

# The macOS build looks for browsers at fixed .app paths. On Linux they are on
# the PATH under any of a dozen names, and which one exists says nothing about
# the distribution -- so ask the system instead of guessing, and fall back to
# xdg-open, which every desktop provides.
LINUX_BROWSERS = '''
import shutil
names = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser',
         'microsoft-edge', 'microsoft-edge-stable', 'brave-browser', 'vivaldi']
exe = next((shutil.which(n) for n in names if shutil.which(n)), None)
if exe:
    prof = os.path.join(tempfile.gettempdir(), 'shl-appwindow')
    p = subprocess.Popen([exe, '--app=' + url, '--user-data-dir=' + prof,
                          '--proxy-server=direct://', '--proxy-bypass-list=<-loopback>',
                          '--no-first-run', '--no-default-browser-check'])
    t0 = time.time(); p.wait()
    if time.time() - t0 > 5: sys.exit(0)
opener = shutil.which('xdg-open')
if opener:
    subprocess.Popen([opener, url],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
else:
    webbrowser.open(url)
'''


def serve_py_for_linux():
    """The macOS server, with its browser hunt swapped for a Linux one."""
    src = MAC.SERVE_PY
    start = src.index("browsers = ['/Applications/Google Chrome.app")
    end = src.index("webbrowser.open(url)", start) + len('webbrowser.open(url)')
    out = src[:start] + LINUX_BROWSERS.strip() + src[end:]
    assert '/Applications/' not in out, 'a macOS path survived into the Linux build'
    return out


SHELL = '''#!/bin/sh
# ============================================================
#  Smart Home League - Linux (single-file edition)
#
#  Run me:      sh "Smart Home League (Linux).sh"
#  Or:          chmod +x "Smart Home League (Linux).sh" && ./"Smart Home League (Linux).sh"
#
#  Nothing is installed and nothing is left behind: the game is
#  unpacked into a private temp folder and deleted on exit.
# ============================================================
PY="$(command -v python3 || command -v python || true)"
if [ -z "$PY" ]; then
  echo "python3 was not found. Install it with ONE of:"
  echo "   sudo apt install python3        # Debian, Ubuntu, Mint"
  echo "   sudo dnf install python3        # Fedora"
  echo "   sudo pacman -S python           # Arch, Manjaro"
  exit 1
fi
D="${TMPDIR:-/tmp}/shl-$$"
mkdir -p "$D" || { echo "could not create $D"; exit 1; }
trap 'rm -rf "$D"' EXIT INT TERM
N=$(awk '/^__PAYLOAD__$/{print NR+1; exit}' "$0")
tail -n +"$N" "$0" | "$PY" -c 'import sys,base64;sys.stdout.buffer.write(base64.b64decode(sys.stdin.read()))' > "$D/pack.zip"
"$PY" -c 'import sys,zipfile;zipfile.ZipFile(sys.argv[1]).extract("__serve.py",sys.argv[2])' "$D/pack.zip" "$D"
"$PY" "$D/__serve.py" "$D/pack.zip"
exit 0
__PAYLOAD__
'''

README = chr(10).join([
    "HOW TO RUN - Smart Home League on Linux",
    "=======================================",
    "",
    "Unpack this archive, then in a terminal, in the folder you unpacked to:",
    "",
    "    ./'Smart Home League (Linux).sh'",
    "",
    "If that says 'permission denied', the execute bit was lost in transit:",
    "",
    "    chmod +x 'Smart Home League (Linux).sh'",
    "",
    "or simply run it through the shell, which never needs the bit:",
    "",
    "    sh 'Smart Home League (Linux).sh'",
    "",
    "REQUIREMENTS",
    "  python3 - already present on essentially every desktop Linux.",
    "  If it is missing:",
    "      sudo apt install python3      (Debian, Ubuntu, Mint)",
    "      sudo dnf install python3      (Fedora)",
    "      sudo pacman -S python         (Arch, Manjaro)",
    "",
    "The game opens in its own window if Chrome, Chromium, Edge, Brave or",
    "Vivaldi is installed; otherwise it opens in your default browser.",
    "Closing the terminal stops the game and deletes its temporary files.",
    "",
    "Nothing is installed. Nothing is left behind.",
    "",
])


def main():
    if not os.path.isdir(SRC):
        raise SystemExit('no SmartHome-Protected - run tools/protect.py first')

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('__serve.py', serve_py_for_linux())
        for root, _dirs, files in os.walk(SRC):
            for f in files:
                if f.endswith('.command') or f.endswith('.sh'):
                    continue
                p = os.path.join(root, f)
                z.write(p, os.path.relpath(p, SRC).replace('\\', '/'))
    payload = base64.b64encode(buf.getvalue()).decode('ascii')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    # LF endings and ascii only: a CRLF in the shebang line is the classic way
    # a shell script dies on Linux with "bad interpreter"
    with open(OUT, 'w', encoding='ascii', newline='\n') as f:
        f.write(SHELL)
        for i in range(0, len(payload), 120):
            f.write(payload[i:i + 120] + '\n')
    print('wrote', OUT, '(%.1f MB)' % (os.path.getsize(OUT) / 1e6))

    # ---- and the archive that KEEPS the +x bit ---------------------------
    # A file copied off Windows arrives with no execute permission. A zip
    # entry can carry the mode, and every Linux unzip restores it, so the
    # download is runnable without anyone being told to chmod first.
    zip_out = os.path.join(os.path.dirname(OUT), 'Smart Home League (Linux).zip')
    with zipfile.ZipFile(zip_out, 'w', zipfile.ZIP_DEFLATED) as z:
        info = zipfile.ZipInfo('Smart Home League (Linux).sh')
        info.external_attr = (0o100755 << 16)          # -rwxr-xr-x
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, open(OUT, 'rb').read())
        ri = zipfile.ZipInfo('HOW TO RUN (read me).txt')
        ri.external_attr = (0o100644 << 16)
        ri.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(ri, README)
    print('wrote', zip_out, '(%.1f MB)' % (os.path.getsize(zip_out) / 1e6))


if __name__ == '__main__':
    main()
