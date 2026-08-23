# type: ignore
# cspell:ignore frontleft frontright wheelleft wheelright mytiles rivaltiles timeleft
# ============================================================
#  CHAMPION U14  -  a COMPLETE reference program for U14.
#  🏆 قهرمان U14 — برنامه‌ی کامل و مرجع رده‌ی زیر ۱۴.
#
#  U14's house is ALIVE: a cat, a dog, wet floor, and a rival who
#  steals tiles back. This file is the starter grown up — same
#  bones, four upgrades, each one MEASURED before it earned its
#  place here (numbers from 100 s solo runs on the big house):
#  این فایل همان استارتر است که بزرگ شده — چهار ارتقا، و هر کدام
#  قبل از آمدن به این‌جا اندازه‌گیری شده (اجرای ۱۰۰ ثانیه‌ای انفرادی):
#
#  1) TURN THE SAME WAY, EVERY TIME · همیشه یک‌طرف بچرخ!
#     We tried "escape toward the open side" — it scored 54 tiles,
#     because alternating turns WOBBLE the robot between two
#     obstacles. Always-right scored 142. The starter's warning is
#     real; the champion keeps it.
#     نسخه‌ی «فرار به سمت بازتر» فقط ۵۴ کاشی گرفت — چون چرخشِ متغیر
#     ربات را بین دو مانع «موج» می‌اندازد. «همیشه راست» ۱۴۲ کاشی
#     گرفت. هشدارِ استارتر جدی است؛ قهرمان نگهش می‌دارد.
#  2) a CORNER branch · شاخه‌ی کنج: هر سه چشم نزدیک = کنج؛ یک چرخش
#     حسابی (~۱۳۰ درجه)، نه ده تکانِ کوچک که برگردند همان‌جا.
#  3) the GREEN rug costs · فرش سبز: نصف سرعت و صفر امتیاز — برگرد.
#     (استارتر این شاخه را «تمرین تو» گذاشته بود؛ این‌جا کامل است.)
#  4) rival colour is PROFIT · رنگ حریف سود است: رد شدن از روی
#     کاشی‌های حریف یعنی پس‌گرفتنشان — از رنگ او فرار نکن!
# ============================================================

# === EDITOR SETUP ==============================================
# The game SKIPS this block - it only teaches the editor the names.
front = 200; frontleft = 200; frontright = 200
left = 200; right = 200; backleft = 200; backright = 200
color = 0; bumper = 0; timer = 0; state = 0; movetime = 0
white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5
heading = 0; mytiles = 0; rivaltiles = 0; timeleft = 0
wheelleft = 0; wheelright = 0
# === END EDITOR SETUP ==========================================

wheelleft = 25                   # default: full speed ahead · پیش‌فرض: تمام سرعت
wheelright = 25

# 1) finish the started move · حرکت شروع‌شده را تمام کن
if timer > 0:
    timer -= 1
    if state == 2:               # reversing in a curve · دنده‌عقب کج
        wheelleft = -25
        wheelright = -8
    elif state == 1:             # turning right · چرخش به راست
        wheelleft = 18
        wheelright = -18
    else:                        # turning left · چرخش به چپ
        wheelleft = -18
        wheelright = 18

# 2) touched something (wall, pet, rival) -> back off, turn right
#    به چیزی خوردم (دیوار/گربه/حریف) — عقب بکش، بعد چرخش به راست
elif bumper == 1:
    state = 1
    timer = 6
    wheelleft = -25
    wheelright = -25

# 3) a CORNER: all three eyes close -> one solid ~130 deg turn
#    کنج: هر سه چشم نزدیک — یک چرخش حسابی، نه تکان‌های کوچک
elif front < 55 and frontleft < 55 and frontright < 55:
    state = 1
    timer = 8
    wheelleft = -15
    wheelright = -15

# 4) wall ahead -> the starter's proven quick back-off + right turn
#    دیوار روبه‌رو — همان مانور اثبات‌شده‌ی استارتر: عقبِ کوتاه + راست
elif front < 75:
    state = 1
    timer = 3
    wheelleft = -10
    wheelright = -10

# 5) something on my front-left -> same move (right, ALWAYS right)
#    چیزی سمت چپ جلوست — همان مانور (راست، همیشه راست)
elif frontleft < 45:
    state = 1
    timer = 3
    wheelleft = -10
    wheelright = -10

# 6) something on my front-right -> STILL right. Consistency beats
#    cleverness here — see the 54-vs-142 note in the header.
#    چیزی سمت راست جلوست — باز هم راست! ثبات این‌جا از زرنگی می‌بَرد؛
#    عدد ۵۴ در برابر ۱۴۲ را در سربرگ ببین.
elif frontright < 45:
    state = 1
    timer = 3
    wheelleft = -10
    wheelright = -10

# 7) the small purple rug: no points there -> reverse away
#    فرش بنفش: امتیاز ندارد — عقب بکش
elif color == purple:
    state = 2
    timer = 5
    wheelleft = -25
    wheelright = -25

# 8) the big green rug: half speed AND no points -> reverse longer
#    فرش سبز: نصف سرعت و بی‌امتیاز — عقبِ بلندتر
elif color == green:
    state = 2
    timer = 7
    wheelleft = -25
    wheelright = -25

else:                            # clear -> full speed. Rival colour ahead?
    wheelleft = 25               # drive THROUGH it - every tile flips to us.
    wheelright = 25              # راه باز — تمام سرعت. رنگ حریف جلوست؟ از
                                 # وسطش رد شو؛ هر کاشی به رنگ ما برمی‌گردد.
