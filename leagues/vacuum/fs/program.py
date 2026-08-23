# type: ignore
# cspell:ignore frontleft frontright backleft backright wheelleft wheelright mytiles rivaltiles atgoal distto angleto stopgoto timeleft
# ============================================================
#  YOUR ROBOT BRAIN  -  your code runs 10 times every second.
#  Read the sensors, then set the two wheels.
#  🧠 مغز ربات تو — این فایل ۱۰ بار در هر ثانیه اجرا می‌شود:
#  اول سنسورها را می‌خوانی، بعد دو چرخ را تنظیم می‌کنی. همین!
#
#  >>>>>>  timer = 10  MEANS  1 SECOND  <<<<<<
#          timer = 5 -> half a second      timer = 20 -> 2 seconds
#          NOT milliseconds!  timer = 500 would reverse for 50 seconds!
#          EASIEST WAY:  timer = seconds(10)  ->  exactly 10 seconds
#  ⏱ یعنی timer = 10 می‌شود «۱ ثانیه» (نه میلی‌ثانیه!).
#     timer = 5 نیم ثانیه است و timer = 500 یعنی ۵۰ ثانیه دنده‌عقب!
#     راحت‌ترین راه: timer = seconds(10) یعنی دقیقاً ۱۰ ثانیه.
#
#  All the numbers are written right where they are used -
#  change any number and the robot changes.
#  🔢 همه‌ی عددها همان‌جایی نوشته شده‌اند که استفاده می‌شوند —
#     هر عددی را عوض کنی، رفتار ربات همان لحظه عوض می‌شود.
#
#  THE FS ROBOT HAS SIX THINGS IT CAN FEEL - and no more.
#  Three eyes forward, the bumper ring, and the colour sensor.
#  (Side and rear eyes, the compass and the GPS are U14's.)
#  🤖 ربات FS فقط شش حس دارد، نه بیشتر: سه چشم رو به جلو،
#     حلقه‌ی ضربه (سپر)، و سنسور رنگ. چشم بغل و عقب، قطب‌نما
#     و GPS مال رده‌ی U14 به بالاست.
#
#  DISTANCE SENSORS  (distance in cm, smaller = closer, max = 200)
#     frontleft   front   frontright
#  📏 سنسورهای فاصله (سانتی‌متر): عدد کوچک‌تر یعنی نزدیک‌تر؛ بیشینه ۲۰۰.
#     frontleft چپِ جلو · front روبه‌رو · frontright راستِ جلو
#
#  BUMPER  (the ring around the robot - you are told WHICH HALF)
#     bumperfront == 1   I ran into something with my front
#     bumperback  == 1   something touched my back
#     bumper      == 1   either of them - anything at all is touching me
#  🛟 سپر (حلقه‌ی دور ربات — می‌گوید کدام نیمه خورده):
#     bumperfront یعنی از جلو خوردم · bumperback یعنی از پشت خوردم
#     bumper یعنی هر کدام — بالاخره چیزی به من چسبیده!
#
#  COLOUR SENSOR  (at the robot's NOSE - it reads the floor just AHEAD)
#     color   ==  white    floor ahead not cleaned yet  -> go get it!
#     color   ==  red      floor ahead was cleaned by the red robot
#     color   ==  blue     floor ahead was cleaned by the blue robot
#     color   ==  green    the BIG rug is ahead   (half speed, no points)
#     color   ==  purple   the SMALL rug is ahead (no points)
#     color   ==  black    a wall or furniture is right ahead
#  🎨 سنسور رنگ (نوک ربات — رنگ کفِ جلوی ربات را می‌گوید):
#     white کف تمیزنشده — برو بگیرش! · red مال ربات قرمز · blue مال آبی
#     green فرش بزرگ (نصف سرعت، بی‌امتیاز) · purple فرش کوچک (بی‌امتیاز)
#     black دیوار یا مبل درست جلوی توست
#  Turn on "Sensors" in the top-left menu to SEE every sensor, the
#  colour name and the wheel speeds live while your robot drives!
#  💡 از منوی بالا-چپ «Sensors» را روشن کن تا همه‌ی سنسورها، رنگ و
#     سرعت چرخ‌ها را همان لحظه که ربات می‌راند ببینی — و ببینی الان
#     کدام خط کدت دارد فرمان می‌دهد!
#
#  TIMER  (your own countdown, keeps its value between steps)
#     Your code runs 10 times per second, so:
#        timer = 10  ->  1 second      timer = 5  ->  half a second
#     IMPORTANT: timer does NOTHING by itself! Setting it only works
#     together with the "if timer > 0:" block at the top of the logic -
#     THAT block is what keeps the move going, step after step.
#     In this file also set `state` so the block knows WHICH move to
#     continue:  state = 2 reverse   state = 1 turn right   -1 turn left
#  ⏳ تایمر (شمارش معکوس خودت — بین اجراها عددش می‌ماند):
#     مهم: timer به‌تنهایی هیچ کاری نمی‌کند! فقط همراهِ بلوک
#     «if timer > 0:» بالای منطق کار می‌کند — همان بلوک است که حرکت را
#     قدم‌به‌قدم ادامه می‌دهد. state هم می‌گوید «کدام» حرکت ادامه یابد:
#     state = 2 دنده‌عقب · state = 1 چرخش به راست · state = -1 به چپ
#
#  EASY MOVES  (one call = the whole move, NO timer or state needed!)
#     backward(5)   drive backward for exactly 5 seconds
#     forward(2)    drive forward for 2 seconds
#     turnleft(1)   turnright(1)   spin for 1 second
#     stop(2)       stand still for 2 seconds
#     Example:      elif bumper == 1:
#                       backward(1)
#     While a move is running, new move calls are ignored until it ends.
#  🎮 حرکت‌های آسان (یک دستور = کل حرکت؛ بدون timer و state):
#     backward(5) پنج ثانیه عقب · forward(2) دو ثانیه جلو
#     turnleft(1) و turnright(1) یک ثانیه چرخش · stop(2) دو ثانیه ایست
#     تا حرکتی تمام نشده، دستور حرکتِ تازه نادیده گرفته می‌شود.
#
#  MOVETIME  (hold MY wheels — variable style, countdown is automatic)
#     Set the wheels yourself, then say how long to KEEP them:
#        elif color == green:
#            wheelleft = -25
#            wheelright = -25
#            movetime = seconds(10)   # keep reversing for exactly 10 s
#     The minus-minus happens by itself - no "if timer > 0" block needed.
#     movetime counts down in the panel; 0 means the hold is over.
#  🕐 با movetime چرخ‌ها را خودت تنظیم می‌کنی و می‌گویی چقدر نگهشان
#     دارد — شمارش خودکار است و به بلوک «if timer > 0» نیازی نیست.
#
#  ROOMS  (only on maps that have them, like the Rooms house)
#     room == 0   the living area / hall     room == 1   the KITCHEN
#     room == 2   BEDROOM 1                  room == 3   BEDROOM 2
#     clean1 / clean2 / clean3   how much of that room wears MY
#     colour, 0..100 percent - so I can tell a finished room from
#     one still waiting:  if clean2 > 80: go somewhere else!
#     A marker rug sits at every door: purple = bedroom 1,
#     green = the kitchen, purple on the south side = bedroom 2.
#  🚪 اتاق‌ها (فقط روی نقشه‌هایی که اتاق دارند، مثل خانه‌ی Rooms):
#     room شماره‌ی اتاقی است که الان در آنم؛ clean1 تا clean3 می‌گوید
#     چند درصد از آن اتاق رنگِ من شده — اتاق تمام‌شده را ول کن برو بعدی!
#     دم هر در یک فرش نشانه هست: بنفش = اتاق‌خواب ۱، سبز = آشپزخانه.
#
#  INFO
#     x, y  position (cm)   heading  facing (0..360 deg)
#     mytiles / rivaltiles  tiles owned      timeleft  seconds left
#  ℹ️ اطلاعات: x و y جای من (سانتی‌متر) · heading جهت (۰ تا ۳۶۰ درجه)
#     mytiles کاشی‌های من · rivaltiles مالِ حریف · timeleft ثانیه‌های مانده
#
#  POSITION (GPS)  -  the BOTTOM-LEFT corner is (0,0), x grows right, y grows UP
#     On the standard map the far corner is (1000,1000), the centre (500,500).
#        goto(500, 500)   drive there on the straight line, hands-free;
#                         the robot turns, drives, and stops by itself
#        atgoal == 1      the goto has arrived (0 while still driving)
#        distto(x, y)     distance to a point in cm
#        angleto(x, y)    compass direction to a point (compare with heading)
#        stopgoto()       cancel the goto and take the wheels back
#     goto does NOT dodge furniture, walls, the cat or the dog -
#     watch bumper and the sensors while it drives!
#     Example:   if timeleft < 20:
#                    goto(500, 500)      # go camp the centre at the end
#  📍 جی‌پی‌اس: گوشه‌ی پایین-چپ (0,0) است. goto(500,500) یعنی خودش
#     تا آن نقطه براند و بایستد؛ atgoal که ۱ شد یعنی رسید.
#     حواست باشد: goto از روی مبل و دیوار و گربه رد نمی‌شود —
#     موقع راندنش، سپر و سنسورها را بپا!
#
#  BATTERY + CHARGING STATION  -  the U19 league only
#     battery          0..100, how much charge is left
#                      100% = about 60 s of full-throttle driving
#     dockx, docky     where the charging station is, in cm (same grid as x,y)
#                      a FIXED home by the east shelf - the same every match
#                      both are -1 in FS and U14 (there is no station)
#     Park ON the pad to refill: +25% per second. An EMPTY battery STOPS the
#     robot dead where it stands - it will not move again, so leave enough
#     charge to get back!   Rule of thumb: keep more than
#         distto(dockx, docky) / 30   percent in the tank.
#     Example:   if battery < 30:
#                    goto(dockx, docky)  # go charge, then carry on
#     The 10s "stuck" watchdog is paused while you are charging, but it
#     comes back the moment you are full - do NOT camp on the pad.
#  🔋 باتری و ایستگاه شارژ (فقط رده‌ی U19): باتری ۱۰۰٪ یعنی حدود
#     ۶۰ ثانیه راندن با تمام سرعت. روی پد پارک کن تا ۲۵٪ در ثانیه پر شود.
#     باتریِ صفر یعنی ربات همان‌جا برای همیشه خاموش می‌ماند — پس همیشه
#     به‌اندازه‌ی راهِ برگشت شارژ نگه دار: distto(dockx, docky) / 30 درصد.
#
#  ASSISTIVE TECHNOLOGY league  -  you are GUIDING a person
#     backleft, backright  the person walks BEHIND you - this is how you
#                          notice when they stop or fall behind
#     personback           distance to them in cm (60-70 = comfortable)
#     personwait == 1      they lost you and stopped to wait
#     goalx, goaly         where they want to go   (-1 in U19)
#     goalname             WHICH room: compare with kitchen / door / sofa /
#                          bedroom / window / table
#     roomx(kitchen)       ask the house for a room's address (U19)
#     goalsleft            destinations still to deliver
#     Fast is NOT the goal: +30 arriving with them, +20 for a chore
#     done alone, -6 if they hit furniture, -100 if they FALL, and
#     violent swerves cost too.
#  🦯 لیگ فناوری کمکی: تو راهنمای یک آدم هستی که پشت سرت راه می‌رود.
#     personback فاصله‌اش تا توست (۶۰ تا ۷۰ خوب است) و سرعتِ زیاد
#     اصلاً هدف نیست — اگر بیفتد ۱۰۰ امتیاز از دست می‌دهی!
#
#  SUMO league  -  the knockout bout (that league ships its own program)
#     arenax, arenay, arenar  the platform: centre and radius (cm)
#     edge                    my distance to the drop, in cm
#     rivalx, rivaly          where the rival is
#     cliff1..cliffN == 1     that edge sensor sees the DROP
#     Shove the rival off the platform - first to 3 knockouts wins.
#  🤼 لیگ سومو: حریف را از سکو بینداز پایین — edge فاصله‌ی من تا لبه
#     است و cliff یعنی آن سنسور لبه، پرتگاه را می‌بیند.
#
#  WHEELS  (set these every step, from -25 to 25)
#      25,  25  = forward, full speed      -25, -25 = backward
#      25, -25  = turn right in place      -25,  25 = turn left in place
#      12,  12  = forward at half speed
#  🛞 چرخ‌ها (هر قدم مقدار بده؛ از -۲۵ تا ۲۵):
#     «۲۵ و ۲۵» جلو با تمام سرعت · «-۲۵ و -۲۵» عقب
#     «۲۵ و -۲۵» چرخش درجا به راست · «-۲۵ و ۲۵» به چپ · «۱۲ و ۱۲» نصف سرعت
# ============================================================

# === EDITOR SETUP ==============================================
# The game SKIPS this whole block! It exists only so VS Code knows
# these names and stops drawing red lines under them.
# Do NOT write your own code inside this block.
# بازی این بلوک را کامل رد می‌کند! فقط برای این است که ویرایشگر کد
# اسم سنسورها را بشناسد و زیرشان خط قرمز نکشد. کد خودت را اینجا ننویس.
front = 200; frontleft = 200; frontright = 200
bumperfront = 0; bumperback = 0
left = 200; right = 200; backleft = 200; backright = 200
color = 0; bumper = 0; timer = 0; state = 0; movetime = 0; atgoal = 0
white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5
x = 0; y = 0; heading = 0; mytiles = 0; rivaltiles = 0; timeleft = 0
battery = 100; dockx = -1; docky = -1
personback = 60; personwait = 0; goalx = -1; goaly = -1; goalname = 0; goalsleft = 0
kitchen = 1; door = 2; sofa = 3; bedroom = 4; window = 5; table = 6
zonex = -1; zoney = -1; zoner = -1; inzone = 0; rivalinzone = 0; rivalx = -1; rivaly = -1
room = 0; clean1 = 0; clean2 = 0; clean3 = 0
wheelleft = 0; wheelright = 0
# === END EDITOR SETUP ==========================================


# ---------- HOW THIS WORKS ----------
# This file runs 10 times every second, from top to bottom.
# Your code cannot "wait", so a move that should last a while is started
# by putting a number in `timer`, and `state` remembers WHICH move it is:
#     state = 1  -> turning right      state = -1 -> turning left
#     state = 2  -> reversing
# Every step the first block counts the timer down and keeps that move going.
#
# 🧭 این‌جوری کار می‌کند: کدت نمی‌تواند «صبر» کند؛ حرکتی که باید طول
# بکشد را با گذاشتن یک عدد در timer شروع می‌کنی و state یادش می‌ماند
# «کدام» حرکت بود. بلوک اول در هر قدم تایمر را کم می‌کند و همان حرکت
# را ادامه می‌دهد.
#
# HOW LONG IS A TURN?  timer counts steps, 10 steps = 1 second:
#     timer = 3   ->  0.3 s of turning  =  about  50 degrees
#     timer = 5   ->  0.5 s of turning  =  about  80 degrees
#     timer = 10  ->  1.0 s of turning  =  about 165 degrees
# Want the robot to turn further? Just use a BIGGER number in timer.
# 🔄 چقدر بچرخم؟ timer قدم می‌شمارد و ۱۰ قدم = ۱ ثانیه:
#     timer = 3 حدود ۵۰ درجه · timer = 5 حدود ۸۰ درجه · timer = 10 حدود ۱۶۵ درجه
#     چرخش بیشتر می‌خواهی؟ عدد بزرگ‌تری در timer بگذار.
#
# Add your own elif branches below - the first one that is true wins.
# ✍️ شاخه‌های elif خودت را پایین اضافه کن — اولین شرطِ درست برنده است.


# ---------- THE ROBOT LOGIC ----------

wheelleft = 25                   # by default: drive straight ahead, full speed
wheelright = 25                  # پیش‌فرض: مستقیم جلو با تمام سرعت

# ۱) آیا هنوز مشغول حرکت قبلی‌ام؟ تا timer صفر نشده همان را ادامه بده.
if timer > 0:                    # 1) am I still busy with the last move?
    timer -= 1
    if state == 2:               #    reversing in a curve (one wheel slower,
        wheelleft = -25          #    so we also rotate away and do not drive
        wheelright = -8          #    straight back into the same spot)
                                 #    دنده‌عقبِ کج: یک چرخ کندتر، تا هم دور
                                 #    شویم هم دوباره به همان‌جا برنگردیم
    elif state == 1:             #    turning right · چرخش به راست
        wheelleft = 18
        wheelright = -18
    else:                        #    turning left · چرخش به چپ
        wheelleft = -18
        wheelright = 18

# ۲) چیزی به پشتم خورده! دنده‌عقب فقط محکم‌تر فشارش می‌دهد —
#    راه نجات، جلو رفتن است. برای همین حلقه‌ی سپر دو نیمه دارد.
elif bumperback == 1:            # 2) something is touching MY BACK. Reversing
    state = 1                    #    now would only press it harder, so the
    timer = 6                    #    way out is FORWARD - and then turn right.
    wheelleft = 25               #    This is why the ring has two halves.
    wheelright = 25

# ۳) با جلو به چیزی کوبیدم — عقب بکش و بعد ۰٫۶ ثانیه (حدود ۱۰۰ درجه)
#    بچرخ تا تلاش بعدی از جای واقعاً تازه‌ای شروع شود.
elif bumperfront == 1:           # 3) I RAN INTO something with my front
    state = 1                    #    -> back off, then keep turning right for
    timer = 6                    #    0.6 s (about 100 degrees), so the next
    wheelleft = -25              #    try starts somewhere genuinely new
    wheelright = -25

# ۴) دیوار نزدیک‌تر از ۷۵ سانتی‌متر روبه‌روست — عقب بکش، بعد راست بچرخ.
#    timer = 3 یعنی ۰٫۳ ثانیه چرخش (حدود ۵۰ درجه)؛ عدد بزرگ‌تر = چرخش بیشتر!
elif front < 75:                 # 4) wall closer than 75 cm ahead
    state = 1                    #    -> back off, then turn right
    timer = 3                    #    timer = 3 -> turn 0.3 s (about 50 degrees)
    wheelleft = -10              #       use a bigger number to turn further!
    wheelright = -10

# ۵) چیزی نزدیک‌تر از ۴۵ سانتی‌متر سمتِ چپِ جلوست — عقب بکش، راست بچرخ.
elif frontleft < 45:             # 5) something closer than 45 cm on my LEFT
    state = 1                    #    -> back off, then turn right
    timer = 3
    wheelleft = -10
    wheelright = -10

# ۶) چیزی سمتِ راستِ جلوست. 🧪 امتحان کن: state را -1 کن (چرخش به چپ)
#    و ببین ربات چطور گیج می‌زند و گیر می‌کند — همیشه یک‌طرفه چرخیدن پایدارتر است!
elif frontright < 45:            # 6) something closer than 45 cm on my RIGHT
    state = 1                    #    TRY THIS: change to -1 (turn left) and watch
    timer = 3                    #    the robot start to wobble and get stuck.
    wheelleft = -10              #    Turning the same way every time is steadier!
    wheelright = -10

# ۷) فرش بنفشِ کوچک درست جلوی من است — نیم ثانیه ازش دور شو.
elif color == purple:            # 7) the small PURPLE rug is right ahead
    state = 2                    #    -> reverse away from it for half a second
    timer = 5
    wheelleft = -25
    wheelright = -25

# YOUR TURN: the big GREEN rug slows you down and gives no points,
# but this code does nothing about it! Add your own elif here, e.g.:
#     elif color == green:
#         state = 2            # 2 = reverse (the timer block continues it!)
#         timer = 10           # for 1 second
#         wheelleft = -25
#         wheelright = -25
# Without state and timer the move stops the moment green disappears.
# ✍️ نوبت توست: فرش سبزِ بزرگ سرعتت را نصف می‌کند و امتیازی هم ندارد،
#    ولی این کد هیچ کاری برایش نمی‌کند! elif خودت را همین‌جا اضافه کن
#    (نمونه‌اش بالاست). بدون state و timer، حرکت همان لحظه‌ای که سبز
#    از جلوی سنسور برود قطع می‌شود.

else:                            # 8) nothing in the way -> full speed ahead
    wheelleft = 25               #    راه باز است — با تمام سرعت تمیز کن!
    wheelright = 25
