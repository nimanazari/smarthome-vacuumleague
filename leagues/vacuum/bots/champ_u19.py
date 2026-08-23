# type: ignore
# cspell:ignore frontleft frontright wheelleft wheelright mytiles rivaltiles timeleft dockx docky dumpx dumpy dustmax dustfull
# ============================================================
#  CHAMPION U19  -  a COMPLETE reference program for U19.
#  🏆 قهرمان U19 — برنامه‌ی کامل و مرجع رده‌ی زیر ۱۹.
#
#  U19 is resource management: a battery that DIES for good at 0%,
#  and (solo) a dust bin that fills every 30 tiles. The champion
#  runs a real STATE MACHINE with two errands:
#  U19 یعنی مدیریت منابع: باتری‌ای که در صفر برای همیشه می‌میرد و
#  (تک‌نفره) مخزنی که هر ۳۰ کاشی پر می‌شود. قهرمان یک ماشین حالت
#  واقعی با دو مأموریت دارد:
#
#     state 0  cleaning            · تمیزکاری
#     state 1  driving to a base   · در راهِ پایگاه (شارژ یا تخلیه)
#     state 2  charging on the pad · روی پد، در حال شارژ
#     state 3  backing out         · عقب‌کشیدن از برخورد
#     state 4  sliding along it    · سُرخوردن از کنار مانع
#
#  errand = 1 the charging dock · مأموریت: ایستگاه شارژ
#  errand = 5 the emptying bin  · مأموریت: ایستگاه تخلیه
#
#  THE BUDGET RULE · قانون بودجه: سفرِ خانه حدود home/25 درصد شارژ
#  می‌خواهد؛ ما home/25 + 22 نگه می‌داریم — فرشِ کند، دورزدنِ مبل و
#  سگ را هم حساب کرده‌ایم. مردن در صفر٪ نهایی است؛ حاشیه‌ی چاق
#  ارزان‌تر از یک ربات مرده است. شک کردی؟ زودتر برو.
#
#  TRIP DEADLINES · مهلت سفر: هر سفر فقط ۹ ثانیه (timer = 90) مهلت
#  دارد، چون داورِ «گیرکردن» بعد از ۱۰ ثانیه ۵ کاشی جریمه می‌کند —
#  ما همیشه یک قدم قبل از داور خودمان را آزاد می‌کنیم.
# ============================================================

# === EDITOR SETUP ==============================================
# The game SKIPS this block - it only teaches the editor the names.
front = 200; frontleft = 200; frontright = 200
left = 200; right = 200; backleft = 200; backright = 200
color = 0; bumper = 0; timer = 0; state = 0; movetime = 0; atgoal = 0
white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5
x = 0; y = 0; heading = 0; mytiles = 0; rivaltiles = 0; timeleft = 0
battery = 100; dockx = -1; docky = -1
dust = 0; dustmax = 0; dustfull = 0; dumpx = -1; dumpy = -1
home = 0; needed = 0; flip = 0; errand = 0; targx = 0; targy = 0
wheelleft = 0; wheelright = 0
# === END EDITOR SETUP ==========================================

# once, at the whistle: no errand yet · فقط اول مسابقه: هنوز مأموریتی نیست
if mytiles == 0 and rivaltiles == 0 and timer == 0 and state == 0:
    errand = 0
    targx = 0
    targy = 0

# ---------- the numbers this tick · عددهای این قدم ----------
home = distto(dockx, docky)
needed = home / 25 + 22


# ---------- state 3: back out of whatever we hit ----------
# حالت ۳: عقب‌کشیدن به سمتی که موقع برخورد بازتر بود
if state == 3:
    if timer > 0:
        timer -= 1
        if flip < 1:
            wheelleft = -22
            wheelright = -8
        else:
            wheelleft = -8
            wheelright = -22
    else:
        state = 4                # clear -> slide along it · حالا از کنارش سُر بخور
        timer = 12

# ---------- state 4: slide along the obstacle, then retry the trip ----------
# حالت ۴: در امتداد مانع جلو برو، بعد دوباره راهِ پایگاه را بگیر
elif state == 4:
    if bumper == 1:              # hit something ELSE -> back out again
        if frontleft > frontright:
            flip = 0
        else:
            flip = 1
        state = 3
        timer = 10
        wheelleft = -20
        wheelright = -8
    elif timer > 0:
        timer -= 1
        if flip < 1:
            wheelleft = 8
            wheelright = 24
        else:
            wheelleft = 24
            wheelright = 8
    else:
        if errand == 0:
            state = 0            # we were only cleaning: back to work
                                 # فقط داشتیم تمیز می‌کردیم — برگرد سر کار
        else:
            state = 1            # resume THE SAME errand from here
            timer = 90          # ادامه‌ی همان مأموریت، با مهلت تازه
            goto(targx, targy)

# ---------- state 2: on the pad, drinking ----------
# حالت ۲: روی پد — تا ۱۰۰٪ بمان؛ نیمه‌شارژ رفتن یعنی برگشتِ زود
elif state == 2:
    wheelleft = 0
    wheelright = 0
    if battery > 95:
        state = 0
        errand = 0

# ---------- state 1: driving to the base (dock OR bin) ----------
# حالت ۱: در راه پایگاه (شارژ یا تخلیه) — goto فرمان دارد
elif state == 1:
    timer -= 1
    if errand == 5 and dockx > 0 and battery < home / 25 + 8:
        stopgoto()               # mid-trip EMERGENCY only: barely enough
        errand = 1               # left to reach the dock -> charge first,
        targx = dockx            # dump after. (The fat `needed` margin is
        targy = docky            # for LEAVING to clean; this one is thin
        timer = 90              # on purpose, or the far bin is never
        goto(dockx, docky)       # reached.) · فقط اضطرارِ وسط سفر: به‌زور
                                 # تا داک می‌رسد — اول شارژ، بعد تخلیه.
    elif bumper == 1 or front < 18 or timer <= 0:
        stopgoto()               # hit something, about to, or the trip went
        if frontleft > frontright:   # stale — escape BEFORE the referee's
            flip = 0             # 10 s watchdog fines us 5 tiles.
        else:                    # خوردیم، داریم می‌خوریم، یا سفر بیات شد —
            flip = 1             # قبل از جریمه‌ی داور فرار کن.
        state = 3
        timer = 10
        wheelleft = -20
        wheelright = -8
    elif errand == 5 and dust == 0:
        stopgoto()               # the bin emptied itself: back to work
        state = 0                # مخزن خالی شد — برگرد سر کار
        errand = 0
    elif errand == 1 and home < 25:
        stopgoto()               # close enough: park and drink
        state = 2                # رسیدیم — پارک کن و بنوش
        wheelleft = 0
        wheelright = 0
    # else: goto steers · وگرنه goto دارد می‌راند

# ---------- state 0: cleaning, with one eye on the gauges ----------
# حالت ۰: تمیزکاری — و یک چشم همیشه روی عقربه‌ها
else:
    # errand 1: battery low (planned OR emergency) -> go charge
    # مأموریت ۱: باتری کم — برو شارژ (حسابگرانه یا اضطراری)
    if dockx > 0 and battery < needed:
        state = 1
        errand = 1
        targx = dockx
        targy = docky
        timer = 90
        goto(dockx, docky)
    elif dockx > 0 and battery < 24:
        state = 1
        errand = 1
        targx = dockx
        targy = docky
        timer = 90
        goto(dockx, docky)

    # errand 5: the bin is FULL (solo) -> nothing counts until we empty it
    # مأموریت ۵: مخزن پر است — تا خالی نشود هیچ کاشی‌ای حساب نمی‌شود
    elif dumpx > 0 and dustfull == 1:
        state = 1
        errand = 5
        targx = dumpx
        targy = dumpy
        timer = 90
        goto(dumpx, dumpy)

    # reactive cleaning: steer, don't stop · تمیزکاری واکنشی: فرمان بده، نایست
    elif bumper == 1:
        if frontleft > frontright:
            flip = 0
            wheelleft = -22
            wheelright = -8
        else:
            flip = 1
            wheelleft = -8
            wheelright = -22
        state = 3
        timer = 8
    elif front < 55 and frontleft < 55 and frontright < 55:
        wheelleft = 25           # a corner: spin hard right · کنج — چرخش تند
        wheelright = -25
    elif front < 45:
        if frontleft > frontright:
            wheelleft = -20
            wheelright = 20
        else:
            wheelleft = 20
            wheelright = -20
    elif frontleft < 55:
        wheelleft = 25           # steer away, keep rolling · قوس، بدون توقف
        wheelright = 9
    elif frontright < 55:
        wheelleft = 9
        wheelright = 25
    elif color == green and battery > 40:
        state = 3                # the slow rug wastes charge: back out of it
        flip = 0                 # فرش کند شارژ می‌سوزاند — تا شارژ داری دورش بزن
        timer = 6
        wheelleft = -22
        wheelright = -8
    else:
        wheelleft = 25
        wheelright = 25
