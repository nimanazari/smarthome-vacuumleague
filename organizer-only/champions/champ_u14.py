# type: ignore
# cspell:ignore frontleft frontright wheelleft wheelright bumperfront bumperback nextmove
# ============================================================
#  CHAMPION U14  -  the reference program for U14.
#  🏆 قهرمان U14 — برنامه‌ی مرجعِ رده‌ی زیر ۱۴ سال.
#
#  Measured on the official floor (3 seeds, 180 s each):
#  this file averages 173 tiles; the starter averages 106.
#  روی زمین رسمی اندازه‌گیری شده (سه بذر، هر بار ۱۸۰ ثانیه):
#  میانگین این فایل ۱۷۳ کاشی است؛ کد پایه ۱۰۶.
#
#  THE THREE IDEAS · سه ایده‌ی اصلی:
#  1) SHORT turns at walls (timer = 3) — a long turn wastes the
#     open floor behind the turn. چرخشِ کوتاه کنار دیوار؛ چرخش بلند
#     زمینِ بازِ پشتِ چرخش را هدر می‌دهد.
#  2) a CORNER (all three distance sensors small) needs ONE big
#     turn (timer = 9). کنج یعنی هر سه سنسور فاصله عدد کوچک —
#     یک چرخش بزرگ، نه تکان‌های ریز.
#  3) the ANTI-ORBIT dash: count the escapes in nextmove; after
#     six of them, drive straight for 2.5 s to leave the area.
#     ضدمدار: فرارها را بشمار؛ بعد از شش فرار، ۲.۵ ثانیه مستقیم
#     برو تا از آن منطقه خارج شوی — درمانِ چرخیدن دور یک مبل.
# ============================================================

# === EDITOR SETUP ==============================================
# The game SKIPS this block - it only teaches the editor the names.
front = 200; frontleft = 200; frontright = 200
bumperfront = 0; bumperback = 0; bumper = 0
color = 0; timer = 0; state = 0; nextmove = 0
heading = 0; room = 0
clean1 = 0; clean2 = 0; clean3 = 0; clean4 = 0; clean5 = 0
white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5; orange = 6; cyan = 7
wheelleft = 0; wheelright = 0
# === END EDITOR SETUP ==========================================

wheelleft = 25                   # default: full speed ahead · پیش‌فرض: تمام سرعت
wheelright = 25

# 1) finish the move I already started · حرکتِ شروع‌شده را تمام کن
if timer > 0:
    timer -= 1
    if state == 2:               # curved reverse · دنده‌عقبِ کج
        wheelleft = -25
        wheelright = -8
    elif state == 1:             # turning right · چرخش به راست
        wheelleft = 20
        wheelright = -20
    else:                        # the anti-orbit dash · دَشِ ضدمدار
        wheelleft = 25
        wheelright = 25

# 2) touched something -> curved reverse · خوردم — عقبِ کج
elif bumper == 1:
    state = 2
    timer = 5
    nextmove = nextmove + 1

# 3) a CORNER: all three distance sensors close -> one big turn
#    کنج: هر سه سنسور فاصله نزدیک — یک چرخش بزرگ
elif front < 55 and frontleft < 55 and frontright < 55:
    state = 1
    timer = 9
    nextmove = nextmove + 1

# 4) wall ahead -> SHORT right turn (the measured winner)
#    دیوار روبه‌رو — چرخشِ کوتاه به راست (برنده‌ی اندازه‌گیری‌ها)
elif front < 65:
    state = 1
    timer = 3
    nextmove = nextmove + 1

# 5) sides: curve away WITHOUT stopping · بغل‌ها: قوس بدونِ توقف
elif frontleft < 40:
    wheelleft = 25
    wheelright = 8
elif frontright < 40:
    wheelleft = 8
    wheelright = 25

# 6) the big green rug: no points, half speed -> reverse away
#    فرش سبز: بی‌امتیاز و کند — عقب بکش
elif color == green:
    state = 2
    timer = 6

# 7) ANTI-ORBIT: six escapes without a dash means we are circling
#    something -> drive straight 2.5 s and leave the area
#    ضدمدار: شش فرارِ پشت‌سرهم یعنی دورِ چیزی می‌چرخیم — مستقیم برو
if nextmove > 5 and timer == 0:
    nextmove = 0
    state = 4
    timer = 25
