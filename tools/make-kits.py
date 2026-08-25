# -*- coding: utf-8 -*-
"""
tools/make-kits.py — build BOTH distribution folders:

    python tools/make-kits.py

  · AdminKit/  — the ORGANISER'S copy: everything. The game, the Map
    Maker, the referee tools, the champion solutions, the docs.
  · TeamKit/   — the TEAMS' copy: play + code only. No Map Maker, no
    champion solutions (the teaching bots stay), rulebook + guides in.

Re-run any time; both folders are rebuilt from the CURRENT files.

فارسی: دو بسته می‌سازد — AdminKit برای داور/برگزارکننده (همه‌چیز) و
TeamKit برای تیم‌ها (فقط بازی و کدنویسی؛ بدون مپ‌ساز و بدون کد کامل).
"""
import io, os, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_TOP = {'TeamKit', 'AdminKit', '__pycache__', '.claude', '.git', '.gitignore', 'CLAUDE.md', 'local-notes'}

RUN_FILES = [
    'index.html', 'rulebook.html', 'rulebook-en.html', 'serve.bat', 'serve.ps1', 'favicon.png',
    'engine.js', 'render.js', 'physics.js', 'homeobjects.js', 'sensors.js',
    'robot-parts.js', 'robot-battery.js', 'pyreader.js', 'leagues.js',
    'builder.js', 'robotController.py',
    'RULES.md', 'CODING.md', 'TEACHING.md',
]
RUN_DIRS = ['fonts', 'vendor', 'fsapp', 'leagues']

TEAM_README = """# 🤖 Smart Home League — Team Kit · بسته‌ی تیم

سلام تیم! همه‌چیز برای تمرین، کدنویسی و مسابقه همین‌جاست — بدون نصب، بدون اینترنت.

## اجرا · Run it
1. روی **`serve.bat`** دوبار کلیک کن — **هیچ نصبی لازم نیست**
   (پایتون داشته باشی با پایتون، نداشته باشی خودِ ویندوز سرور می‌شود).
2. مرورگر: **http://localhost:8801/**
> حتماً از راه serve.bat — دوبار کلیک روی index.html کار نمی‌کند.

## هر رده سه چیز دارد · Every league gives you three things
| چی | کجا |
|---|---|
| **بیس‌کد · base code** | دکمه‌ی «Base code .py» در منوی حین بازی، یا `leagues/vacuum/<رده>/program.py` — نقطه‌ی شروعِ شرح‌داده‌شده‌ی دوزبانه |
| **راهنما · the guide** | `rulebook.html` (قوانین کامل با عکس) + 📖 Rules داخل بازی + `leagues/vacuum/<رده>/README.md` (سنسورهای همان رده) |
| **ربات‌های آموزشی** | منوی «ربات‌های آماده»: wallfollow، easymoves، goto، hunter… بخوان، بفهم، بهتر کن |

## از کجا شروع کنم؟
1. `rulebook.html` را بخوان.
2. رده‌ات را انتخاب کن؛ از منوی ☰: **Tutorial**، بعد **هلپرها**
   (FS: بلاکی + AI · U14: AI با قطب‌نما · U19: هلپر مسیر)، بعد **ادیتور**.
3. در **Match mode** برنامه‌ات را مقابل ربات‌های آماده تست کن.

## چه چیزی تحویل بدهیم؟ · What you submit
فقط **یک فایل `.py`** برای هر رده — همان که هلپر/ادیتور می‌سازد
(دکمه‌ی Download .py). قبل از تحویل حتماً در Match mode تستش کن.

Good luck — clean fast, steal faster! 🧹
"""

ADMIN_README = """# 🗝 Smart Home League — Admin Kit · بسته‌ی برگزارکننده

نسخه‌ی کامل داور/برگزارکننده — همه‌چیز، از جمله آنچه تیم‌ها ندارند:

| فقط اینجا | چیست |
|---|---|
| 🛠 **مپ‌ساز** (`leagues/vacuum/mapmaker.html`) | طراحی/ویرایش نقشه، دیوار مگنتی، ★ دیفالت رده، خروجی JSON |
| 🏆 **کدهای کامل** (`organizer-only/champions/` + منوی ربات‌ها) | راه‌حل مرجع هر رده برای تستِ برنامه‌ی تیم‌ها |
| ⚖️ ابزار داور | Official mode، جابه‌جایی دستی، دفتر مسابقات/تورنمنت، بذر (seed) |
| 🧰 `tools/` | `validate-map.js` (اعتبارسنجی نقشه) · `make-kits.py` (ساخت دوباره‌ی همین بسته‌ها) |
| 📚 `docs/` | PDFهای مرجع و فایل‌های پشتیبان |

اجرا مثل تیم‌ها: `serve.bat` → http://localhost:8801/

## ساخت دوباره‌ی بسته‌ها
هر تغییری دادی، در پروژه‌ی اصلی:
```
python tools/make-kits.py
```
`TeamKit/` تازه را زیپ کن و به تیم‌ها بده؛ `AdminKit/` مال خودت.
"""

def clean(dst):
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    os.makedirs(dst)

def copy_set(dst, files, dirs):
    for f in files:
        src = os.path.join(ROOT, f)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(dst, f))
    for d in dirs:
        src = os.path.join(ROOT, d)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(dst, d))

def report(dst):
    n = sum(len(fs) for _, _, fs in os.walk(dst))
    size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(dst) for f in fs)
    print('  %s — %d files, %.1f MB' % (os.path.basename(dst), n, size / 1e6))

def build_admin():
    dst = os.path.join(ROOT, 'AdminKit')
    clean(dst)
    for name in os.listdir(ROOT):
        if name in SKIP_TOP:
            continue
        src = os.path.join(ROOT, name)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(dst, name))
        else:
            shutil.copy2(src, os.path.join(dst, name))
    io.open(os.path.join(dst, 'ADMIN-README.md'), 'w', encoding='utf-8').write(ADMIN_README)
    report(dst)

def build_team():
    dst = os.path.join(ROOT, 'TeamKit')
    clean(dst)
    copy_set(dst, RUN_FILES, RUN_DIRS)
    # ---- teams get NO champion solutions ----
    bots = os.path.join(dst, 'leagues', 'vacuum', 'bots')
    for f in list(os.listdir(bots)):
        if f.startswith('champ_'):
            os.remove(os.path.join(bots, f))
    # ...and the bots menu stops offering them
    lg = os.path.join(dst, 'leagues', 'vacuum', 'league.js')
    s = io.open(lg, encoding='utf-8').read()
    out = [ln for ln in s.split('\n') if 'bots/champ_' not in ln]
    s = '\n'.join(out)
    # ---- teams get NO Map Maker ----
    s = s.replace("    mapmaker: 'leagues/vacuum/mapmaker.html',\n", '')
    io.open(lg, 'w', encoding='utf-8').write(s)
    for f in ['mapmaker.html', 'mapmaker.js']:
        p = os.path.join(dst, 'leagues', 'vacuum', f)
        if os.path.isfile(p):
            os.remove(p)
    io.open(os.path.join(dst, 'README.md'), 'w', encoding='utf-8').write(TEAM_README)
    report(dst)

if __name__ == '__main__':
    print('building the kits from', ROOT)
    build_admin()
    build_team()
    print('done — zip TeamKit/ for the teams; AdminKit/ is yours.')
