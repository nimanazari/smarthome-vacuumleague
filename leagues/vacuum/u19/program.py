# type: ignore
# cspell:ignore frontleft frontright backleft backright wheelleft wheelright mytiles rivaltiles atgoal distto angleto stopgoto timeleft dockx docky
# ============================================================
#  BATTERY RUNNER  -  for the U19 league.
#  🔋 دونده‌ی باتری‌دار — برنامه‌ی شروع رده‌ی U19.
#
#  In U19 the robot runs on a battery:
#     battery        100 -> 0   (100% is about 60 s of full speed)
#     dockx, docky   the charging station, in cm - it has a FIXED
#                    home by the wall, the same in every match
#  در U19 ربات با باتری کار می‌کند: battery از ۱۰۰ تا ۰ (۱۰۰٪ یعنی
#  حدود ۶۰ ثانیه با تمام سرعت). dockx و docky جای ایستگاه شارژ است —
#  جای ثابتی کنار دیوار، در همه‌ی مسابقه‌ها همان‌جا.
#
#  Park ON the pad and it refills at +25% per second.
#  An EMPTY battery STOPS the robot dead, right where it
#  stands, for the rest of the match - so the real skill
#  is leaving for the dock in time, every time.
#  روی پد پارک کن: ۲۵٪ در ثانیه پر می‌شود. باتریِ صفر یعنی ربات
#  همان‌جا تا آخر مسابقه خاموش می‌ماند — مهارتِ واقعی این است که
#  هر بار «به‌موقع» راهیِ ایستگاه شوی.
#
#  The 10 s "stuck" watchdog is paused while you charge, but it
#  is back the moment you hit 100% - so do not camp on the pad.
#  تا وقتی در حال شارژی، داورِ «گیرکردن» کاری به تو ندارد؛ ولی
#  همین که پر شدی برمی‌گردد — روی پد چادر نزن!
#
#  HOW MUCH CHARGE DO I NEED TO GET HOME?
#  At full speed the robot burns about 1.7% per second and covers
#  about 60 cm in that second - but the RUG halves your speed and
#  the trip is never a straight line, so budget generously:
#         distto(dockx, docky) / 25   percent.
#  Plus a FAT margin, because goto() drives a STRAIGHT line and
#  the real trip never is: round the sofa, wait for the dog, back
#  out of a corner. Dying at 0% is now FINAL - once the battery is
#  empty the robot stands there for the rest of the match - so
#  when in doubt, leave for the dock EARLY.
#  ⛽ چقدر شارژ برای برگشتن لازم دارم؟ با تمام سرعت حدود ۱٫۷٪ در
#  ثانیه می‌سوزد و ۶۰ سانتی‌متر می‌روی — ولی فرش سرعتت را نصف می‌کند
#  و مسیر هیچ‌وقت خط راست نیست. پس دست‌ودل‌باز حساب کن:
#  distto(dockx, docky) / 25 درصد + یک حاشیه‌ی چاق. شک داری؟ زودتر برو!
#
#  THE STATE MACHINE
#     state 0   cleaning
#     state 1   driving home
#     state 2   sitting on the pad, drinking
#     state 3   backing out of whatever we hit
#     state 4   sidestepping ALONG it before trying again
#  Writing it as states is what makes it reliable: whatever
#  happens, the robot always knows what it was in the middle of.
#  The escape side (flip) is read off the SENSORS at each bump -
#  we back out toward whichever side is open. Bashing the same
#  corner from the same angle over and over is how batteries die.
#  ⚙️ ماشین حالت:
#     state 0 تمیزکاری · state 1 در راه خانه · state 2 روی پد در حال
#     شارژ · state 3 عقب‌کشیدن از چیزی که به آن خوردیم · state 4
#     سُرخوردن در امتدادش پیش از تلاش دوباره.
#  حالت‌نویسی همان چیزی است که برنامه را قابل‌اعتماد می‌کند: هرچه پیش
#  بیاید، ربات می‌داند وسطِ چه کاری بود. سمتِ فرار (flip) هر بار از
#  روی سنسورها خوانده می‌شود — به سمتِ بازتر عقب می‌کشیم. کوبیدن به
#  همان کنج از همان زاویه، راهِ مردن باتری است.
#
#  THE DUST BIN  -  ONE-PLAYER matches only
#     dust      how many tiles are in the bin, 0..30
#     dustfull  1 = FULL, and a full robot cleans NOTHING
#     dumpx, dumpy   the emptying station, in cm. It is its own
#                    machine, NOT the charging pad - two errands.
#  Drive within reach of it and the bin empties itself. Leave it
#  too late and you spend the whole trip home cleaning nothing,
#  so go when the bin is nearly full and the station is near.
#  🗑 مخزن خاک (فقط مسابقه‌ی تک‌نفره): dust تعداد کاشی‌های داخل مخزن
#  است (۰ تا ۳۰) و dustfull یعنی پُرِ پُر — رباتِ پُر «هیچ» چیزی تمیز
#  نمی‌کند! ایستگاه تخلیه (dumpx و dumpy) دستگاهِ خودش است، نه پد شارژ:
#  دو مأموریت، دو سفر. نزدیکش برسی خودش خالی می‌شود.
#
#  ROOMS  (only on maps that have them, like the Rooms house)
#     room == 0  hall   1  KITCHEN   2  BEDROOM 1   3  BEDROOM 2
#     clean1 / clean2 / clean3   how much of that room wears MY
#     colour, 0..100 percent - a finished room is a room to leave.
#  🚪 اتاق‌ها (فقط نقشه‌های اتاق‌دار): room شماره‌ی اتاق فعلی؛
#     clean1 تا clean3 درصد تمیزیِ هر اتاق — اتاقِ تمام‌شده را ترک کن.
# ============================================================

# === EDITOR SETUP ==============================================
# The game SKIPS this whole block! It exists only so VS Code knows
# these names and stops drawing red lines under them.
# بازی این بلوک را کامل رد می‌کند! فقط برای این است که ویرایشگر کد
# اسم سنسورها را بشناسد و زیرشان خط قرمز نکشد. کد خودت را اینجا ننویس.
front = 200; frontleft = 200; frontright = 200
left = 200; right = 200; backleft = 200; backright = 200
color = 0; bumper = 0; timer = 0; state = 0; movetime = 0; atgoal = 0
white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5
x = 0; y = 0; heading = 0; mytiles = 0; rivaltiles = 0; timeleft = 0
battery = 100; dockx = -1; docky = -1
dust = 0; dustmax = 0; dustfull = 0; dumpx = -1; dumpy = -1
home = 0; needed = 0; flip = 0
room = 0; clean1 = 0; clean2 = 0; clean3 = 0
wheelleft = 0; wheelright = 0
# === END EDITOR SETUP ==========================================


# ---------- how far is home, and how low is too low? ----------
# خانه چقدر دور است، و چند درصد یعنی «خیلی کم»؟
home = distto(dockx, docky)
needed = home / 25 + 25


# ---------- state 3: back out of whatever we hit ----------
# حالت ۳: از چیزی که به آن خوردیم عقب بکش — به سمتی که موقع برخورد بازتر بود.
if state == 3:
    if timer > 0:
        timer -= 1
        if flip < 1:             # the side picked at the moment of the bump
            wheelleft = -22      # سمتی که لحظه‌ی برخورد انتخاب شد
            wheelright = -8
        else:
            wheelleft = -8
            wheelright = -22
    else:
        state = 4                # clear of it -> now slide ALONG it
        timer = 12               # جدا شدیم — حالا در امتدادش سُر بخور


# ---------- state 4: sidestep along the obstacle, then retry ----------
# حالت ۴: در امتداد مانع جابه‌جا شو، بعد دوباره راه خانه را امتحان کن.
elif state == 4:
    if bumper == 1:              # hit something ELSE mid-sidestep? back out
        if frontleft > frontright:   # وسط راه به چیز دیگری خوردیم؟ باز هم
            flip = 0             # again toward whichever side is open NOW
        else:                    # به سمتِ بازتر عقب بکش
            flip = 1
        state = 3
        timer = 10
        wheelleft = -20
        wheelright = -8
    elif timer > 0:
        timer -= 1
        if flip < 1:
            wheelleft = 8        # a forward arc across the obstacle's face,
            wheelright = 24      # not into it
                                 # قوسی رو به جلو از کنار مانع — نه توی آن
        else:
            wheelleft = 24
            wheelright = 8
    else:
        state = 1                # try the trip home again from HERE
        timer = 200              # fresh 20-second deadline
        goto(dockx, docky)       # از همین‌جا دوباره راه خانه را برو —
                                 # با مهلت تازه‌ی ۲۰ ثانیه‌ای


# ---------- state 2: on the pad, drinking ----------
# حالت ۲: روی پد نشسته‌ایم و شارژ می‌نوشیم — از روی پد قِل نخور!
elif state == 2:
    wheelleft = 0                # do NOT roll off the pad
    wheelright = 0
    if battery > 95:
        state = 0                # full -> back to work · پر شد؟ برگرد سر کار


# ---------- state 1: driving home ----------
# حالت ۱: در راه خانه — goto فرمان را دارد؛ ما فقط مواظب برخورد و کهنه‌شدن سفریم.
elif state == 1:
    timer -= 1
    if bumper == 1 or timer <= 0:
        # hit something - or the trip went STALE (20 s without arriving).
        # Either way: stop, back out toward the open side, try fresh.
        # به چیزی خوردیم — یا سفر بیات شد (۲۰ ثانیه بی‌نتیجه). در هر دو
        # حالت: بایست، به سمتِ باز عقب بکش، از نو امتحان کن.
        stopgoto()
        if frontleft > frontright:
            flip = 0             # more room to the LEFT -> escape that way
        else:                    # سمت چپ بازتر است — از همان‌جا فرار کن
            flip = 1             # more room to the RIGHT · سمت راست بازتر
        state = 3
        timer = 10
        wheelleft = -20
        wheelright = -8
    elif home < 25:              # close enough: stop and let it charge
        stopgoto()               # به‌اندازه‌ی کافی نزدیکیم: بایست تا شارژ شود
        state = 2
        wheelleft = 0
        wheelright = 0
    # else: goto is steering, leave the wheels alone
    # در غیر این صورت goto دارد می‌راند — به چرخ‌ها دست نزن


# ---------- state 0: cleaning ----------
# حالت ۰: تمیزکاری — و همیشه یک چشم به باتری.
else:
    # time to head home? Two triggers: the sensible one, and the emergency one.
    # وقتِ برگشتن است؟ دو ماشه دارد: حسابگرانه (شارژ به‌اندازه‌ی مسیر +
    # حاشیه) و اضطراری (زیر ۲۰٪ — دیگر بحث نکن، فقط برو!).
    if dockx > 0 and battery < needed:
        state = 1
        timer = 200              # a trip gets 20 seconds, then we rethink -
        goto(dockx, docky)       # long enough to cross the slow rug honestly
                                 # هر سفر ۲۰ ثانیه مهلت دارد، بعد بازنگری —
                                 # آن‌قدر که از روی فرشِ کند هم صادقانه رد شویم
    elif dockx > 0 and battery < 20:
        state = 1
        timer = 200
        goto(dockx, docky)

    elif front < 25 or bumper == 1:      # something right ahead -> turn away
        wheelleft = 25                   # چیزی درست جلوست — رویت را برگردان
        wheelright = -25
    elif frontleft < frontright:         # more room on the right
        wheelleft = 25                   # سمت راست بازتر است — قوس به راست
        wheelright = 12
    elif frontright < frontleft:         # more room on the left
        wheelleft = 12                   # سمت چپ بازتر است — قوس به چپ
        wheelright = 25
    else:
        wheelleft = 25                   # clear -> full speed, clean!
        wheelright = 25                  # راه باز است — با تمام سرعت تمیز کن!
