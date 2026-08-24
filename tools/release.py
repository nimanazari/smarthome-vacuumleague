# -*- coding: utf-8 -*-
"""
tools/release.py — ONE button publishes everything.

    python tools/release.py "what changed"

1. rebuilds AdminKit/ + TeamKit/  (make-kits.py)
2. commits + pushes the FULL game        -> github.com/nimanazari/smarthome-vacuumleague (private, yours)
3. mirrors TeamKit into the players repo -> github.com/nimanazari/smarthome-teams (public, for the teams)

فارسی: یک دستور، هر دو ریپو به‌روز — کامل برای خودت، کیتِ تیم‌ها برای بچه‌ها.
"""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEAMS = os.path.join(os.path.dirname(ROOT), 'smarthome-teams')
MSG = sys.argv[1] if len(sys.argv) > 1 else 'update'
GIT_ID = ['-c', 'user.email=Negaahenorobotic@gmail.com', '-c', 'user.name=SHL Organizer']

def run(args, cwd):
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr).strip()

# 1 — fresh kits
print('building kits ...')
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
