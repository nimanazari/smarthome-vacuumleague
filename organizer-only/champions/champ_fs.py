# type: ignore
# cspell:ignore frontleft frontright wheelleft wheelright bumperfront bumperback mytiles rivaltiles timeleft
# ============================================================
#  CHAMPION FS  -  a COMPLETE reference program for First Step.
#  🏆 قهرمان FS — یک برنامه‌ی کامل و مرجع برای رده‌ی فرست استپ.
#
#  Everything an FS robot can feel is used here, and nothing else:
#  three front eyes, the two bumper halves, the colour sensor.
#  هر شش حسِ ربات FS این‌جا به کار رفته و هیچ چیز بیشتری نه:
#  سه چشم جلو، دو نیمه‌ی سپر، سنسور رنگ.
#
#  THE THREE IDEAS THAT MAKE IT STRONG · سه ایده‌ای که قوی‌اش می‌کند:
#  1) escape TOWARD THE OPEN SIDE — هنگام فرار، به سمتِ بازتر بچرخ
#     (نه همیشه یک طرف): frontleft و frontright را مقایسه می‌کنیم.
#  2) a CORNER needs a BIG turn — کنج را با چرخش بزرگ (~۱۸۰ درجه)
#     ترک کن، نه با تکان‌های کوچک که دوباره به همان‌جا برمی‌گردند.
#  3) rugs give no points — فرش‌ها امتیاز ندارند؛ سبز حتی سرعتت را
#     نصف می‌کند. هر دو را ببین و عقب بکش.
# ============================================================

# === EDITOR SETUP ==============================================
# The game SKIPS this block - it only teaches the editor the names.
front = 200; frontleft = 200; frontright = 200
bumperfront = 0; bumperback = 0; bumper = 0
color = 0; timer = 0; state = 0; movetime = 0
white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5
mytiles = 0; rivaltiles = 0; timeleft = 0
wheelleft = 0; wheelright = 0
# === END EDITOR SETUP ==========================================

wheelleft = 25                   # default: full speed ahead · پیش‌فرض: با تمام سرعت جلو
wheelright = 25

# 1) finish the move I already started · حرکتِ شروع‌شده را تمام کن
if timer > 0:
    timer -= 1
    if state == 2:               # reversing in a curve · دنده‌عقبِ کج
        wheelleft = -25
        wheelright = -8
    elif state == 1:             # turning right · چرخش به راست
        wheelleft = 18
        wheelright = -18
    else:                        # turning left · چرخش به چپ
        wheelleft = -18
        wheelright = 18

# 2) something touched MY BACK -> the way out is FORWARD
#    چیزی به پشتم خورد — راه نجات جلوست، بعد یک چرخش
elif bumperback == 1:
    if frontleft > frontright:   # turn toward the open side · سمتِ بازتر
        state = -1
    else:
        state = 1
    timer = 6
    wheelleft = 25
    wheelright = 25

# 3) I ran into something with my front -> back off, then turn
#    با جلو کوبیدم — عقب بکش و به سمتِ بازتر بچرخ
elif bumperfront == 1:
    if frontleft > frontright:
        state = -1
    else:
        state = 1
    timer = 7
    wheelleft = -25
    wheelright = -25

# 4) ALL THREE eyes see close walls: that is a CORNER.
#    Small turns bounce back in — take one BIG turn (about 180).
#    هر سه چشم دیوار نزدیک می‌بینند: کنج است! چرخش بزرگ، نه تکان کوچک.
elif front < 60 and frontleft < 60 and frontright < 60:
    state = 1
    timer = 11                   # ~1.1 s of spin ≈ 180 deg
    wheelleft = -15
    wheelright = -15

# 5) wall ahead -> back off toward the open side
#    دیوار روبه‌روست — به سمتِ بازتر عقب بکش
elif front < 65:
    if frontleft > frontright:
        state = -1
    else:
        state = 1
    timer = 4
    wheelleft = -12
    wheelright = -12

# 6) something on my front-left -> ease right WITHOUT stopping
#    چیزی سمت چپِ جلوست — بدون توقف، قوسِ نرم به راست
elif frontleft < 45:
    wheelleft = 25
    wheelright = 9

# 7) something on my front-right -> ease left
#    چیزی سمت راستِ جلوست — قوسِ نرم به چپ
elif frontright < 45:
    wheelleft = 9
    wheelright = 25

# 8) the SMALL purple rug: no points there — reverse away
#    فرش بنفش: امتیاز ندارد — عقب بکش
elif color == purple:
    state = 2
    timer = 5
    wheelleft = -25
    wheelright = -25

# 9) the BIG green rug: no points AND half speed — reverse longer
#    فرش سبز: بی‌امتیاز و نصف سرعت — عقبِ بلندتر
elif color == green:
    state = 2
    timer = 8
    wheelleft = -25
    wheelright = -25

else:                            # clear floor -> clean at full speed
    wheelleft = 25               # راه باز است — با تمام سرعت تمیز کن
    wheelright = 25
