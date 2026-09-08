# -*- coding: utf-8 -*-
"""
tools/release.py — ONE button publishes everything.

    python tools/release.py "what changed"

1. rebuilds AdminKit/ + TeamKit/  (make-kits.py)
2. commits + pushes the FULL game        -> github.com/nimanazari/smarthome-vacuumleague (private, yours)
3. mirrors TeamKit into the players repo -> github.com/nimanazari/smarthome-teams (public, for the teams)

فارسی: یک دستور، هر دو ریپو به‌روز — کامل برای خودت، کیتِ تیم‌ها برای بچه‌ها.
"""
import io, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEAMS = os.path.join(os.path.dirname(ROOT), 'smarthome-teams')
MSG = sys.argv[1] if len(sys.argv) > 1 else 'update'
GIT_ID = ['-c', 'user.email=Negaahenorobotic@gmail.com', '-c', 'user.name=SHL Organizer']

def run(args, cwd):
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr).strip()

# 1 — fresh kits
print('building kits ...')
# ---- stamp the build, so the app and the site agree on what is current ----
# tools/app.py carries BUILD = '<sha>' and asks the site for the same field.
# If the two ever disagree, every team is told to update a build that is
# already the newest one -- so both are written from ONE commit, here.
def stamp_build():
    sha = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT,
                         capture_output=True, text=True).stdout.strip()
    if not sha:
        print('  (no git sha - leaving the build stamp alone)')
        return
    ap = os.path.join(ROOT, 'tools', 'app.py')
    a = io.open(ap, encoding='utf-8').read()
    a2 = re.sub(r"^BUILD = '[^']*'", "BUILD = '" + sha + "'", a, count=1, flags=re.M)
    if a2 != a:
        io.open(ap, 'w', encoding='utf-8').write(a2)
        print('  app.py stamped', sha)
    site = os.path.normpath(os.path.join(
        ROOT, '..', 'schedule', 'schedule', 'public', 'downloads', 'version.json'))
    if os.path.isdir(os.path.dirname(site)):
        payload = ('{' + chr(10) + '  "build": "' + sha + '",' + chr(10)
                   + '  "page": "https://smarthomeleague.ir/getting-started",' + chr(10)
                   + '  "note": "Rules, lessons and the app are all current on the website."' + chr(10)
                   + '}' + chr(10))
        io.open(site, 'w', encoding='utf-8').write(payload)
        print('  version.json published', sha)

stamp_build()

# ---- the site's /game is the TeamKit, refreshed on every release ----
# smarthomeleague.ir/game/ serves a copy of the game. It is rebuilt here from
# the TeamKit (no champion code, no referee lock) PLUS the Map Maker, which
# server.js hands only to a logged-in admin. Docs (*.md) stay out of the site.
def sync_site_game():
    import shutil
    site = os.path.normpath(os.path.join(ROOT, '..', 'schedule', 'schedule', 'public'))
    if not os.path.isdir(site):
        print('  (no site checkout next door - /game not refreshed)')
        return
    src = os.path.join(ROOT, 'TeamKit')
    dst = os.path.join(site, 'game')
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns('*.md', '__pycache__'))
    # the referee's Map Maker rides along (admin-only on the server) and the
    # game's pencil button points at it again
    for f in ['mapmaker.html', 'mapmaker.js']:
        shutil.copy2(os.path.join(ROOT, 'leagues', 'vacuum', f), os.path.join(dst, 'leagues', 'vacuum', f))
    lg = os.path.join(dst, 'leagues', 'vacuum', 'league.js')
    t = io.open(lg, encoding='utf-8').read()
    if "mapmaker: 'leagues/vacuum/mapmaker.html'" not in t:
        t = t.replace("    icon: '\U0001f9f9',\n", "    icon: '\U0001f9f9',\n    mapmaker: 'leagues/vacuum/mapmaker.html',\n", 1)
        io.open(lg, 'w', encoding='utf-8').write(t)
    n = sum(len(fs) for _, _, fs in os.walk(dst))
    print('  site /game refreshed from TeamKit (%d files) -> %s' % (n, dst))

sync_site_game()

rc, out = run([sys.executable, os.path.join(ROOT, 'tools', 'make-kits.py')], ROOT)
print(out.splitlines()[-1] if out else '')
if rc: sys.exit('make-kits failed')

# 2 — the full game repo
print('pushing the full game ...')
run(['git', 'add', '-A'], ROOT)
rc, out = run(['git'] + GIT_ID + ['commit', '-m', MSG], ROOT)
print('  commit:', 'nothing new' if rc else 'ok')
rc, out = run(['git', 'push'], ROOT)
print('  push:', out.splitlines()[-1] if out else 'ok')

# 3 — mirror TeamKit into the players repo
print('publishing the TeamKit ...')
if not os.path.isdir(os.path.join(TEAMS, '.git')):
    sys.exit('players repo not found at ' + TEAMS)
subprocess.run(['robocopy', os.path.join(ROOT, 'TeamKit'), TEAMS, '/MIR', '/XD', '.git'],
               capture_output=True)   # robocopy exit codes < 8 are success
run(['git', 'add', '-A'], TEAMS)
rc, out = run(['git'] + GIT_ID + ['commit', '-m', MSG], TEAMS)
print('  commit:', 'nothing new' if rc else 'ok')
rc, out = run(['git', 'push'], TEAMS)
print('  push:', out.splitlines()[-1] if out else 'ok')
print('done — both repos are fresh.')
