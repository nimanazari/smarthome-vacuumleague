# type: ignore
# cspell:ignore frontleft frontright backleft backright wheelleft wheelright mytiles rivaltiles atgoal distto angleto stopgoto timeleft
# ============================================================
#  YOUR ROBOT BRAIN  -  your code runs 10 times every second.
#  Read the sensors, then set the two wheels.
#
#  >>>>>>  timer = 10  MEANS  1 SECOND  <<<<<<
#          timer = 5 -> half a second      timer = 20 -> 2 seconds
#          NOT milliseconds!  timer = 500 would reverse for 50 seconds!
#          EASIEST WAY:  timer = seconds(10)  ->  exactly 10 seconds
#
#  All the numbers are written right where they are used -
#  change any number and the robot changes.
#
#  DISTANCE SENSORS  (distance in cm, smaller = closer, max = 200)
#     frontleft   front   frontright
#     left                right
#     backleft            backright
#
#  BUMPER  (the ring around the robot)
#     bumper == 1   I am touching a wall, furniture, the cat, the dog or the rival
#     bumper == 0   nothing is touching me
#
#  COLOUR SENSOR  (at the robot's NOSE - it reads the floor just AHEAD)
#     color   ==  white    floor ahead not cleaned yet  -> go get it!
#     color   ==  red      floor ahead was cleaned by the red robot
#     color   ==  blue     floor ahead was cleaned by the blue robot
#     color   ==  green    the BIG rug is ahead   (half speed, no points)
#     color   ==  purple   the SMALL rug is ahead (no points)
#     color   ==  black    a wall or furniture is right ahead
#  Turn on "Sensors" in the top-left menu to SEE every sensor, the
#  colour name and the wheel speeds live while your robot drives!
#
#  TIMER  (your own countdown, keeps its value between steps)
#     Your code runs 10 times per second, so:
#        timer = 10  ->  1 second      timer = 5  ->  half a second
#     IMPORTANT: timer does NOTHING by itself! Setting it only works
#     together with the "if timer > 0:" block at the top of the logic -
#     THAT block is what keeps the move going, step after step.
#     In this file also set `state` so the block knows WHICH move to
#     continue:  state = 2 reverse   state = 1 turn right   -1 turn left
#
#  EASY MOVES  (one call = the whole move, NO timer or state needed!)
#     backward(5)   drive backward for exactly 5 seconds
#     forward(2)    drive forward for 2 seconds
#     turnleft(1)   turnright(1)   spin for 1 second
#     stop(2)       stand still for 2 seconds
#     Example:      elif bumper == 1:
#                       backward(1)
#     While a move is running, new move calls are ignored until it ends.
#
#  MOVETIME  (hold MY wheels — variable style, countdown is automatic)
#     Set the wheels yourself, then say how long to KEEP them:
#        elif color == green:
#            wheelleft = -25
#            wheelright = -25
#            movetime = seconds(10)   # keep reversing for exactly 10 s
#     The minus-minus happens by itself - no "if timer > 0" block needed.
#     movetime counts down in the panel; 0 means the hold is over.
#
#  INFO
#     x, y  position (cm)   heading  facing (0..360 deg)
#     mytiles / rivaltiles  tiles owned      timeleft  seconds left
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
#
#  DUST BIN + EMPTYING STATION  -  U19, ONE-PLAYER matches only
#     dust             how many tiles are in the bin right now, 0..30
#     dustmax          how many it holds (30), or 0 when the rule is off
#     dustfull         1 = FULL. From that moment the robot cleans NOTHING
#                      until it empties - it drives, but the floor stays dirty
#     dumpx, dumpy     where the emptying station is, in cm (same grid as x,y)
#                      a machine of its OWN, nowhere near the charging pad
#     Drive within reach of it and the bin empties itself, then carry on.
#     Example:   if dust > 24:
#                    goto(dumpx, dumpy)  # go empty, then back to cleaning
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
#     Fast is NOT the goal: +30 arriving with them, +20 a chore done alone,
#     -6 if they hit furniture, -2 every second they are left behind, and
#     violent swerves cost too.
#
#  SUMO league  -  the knockout bout (see leagues/sumo/u14/program.py)
#     arenax, arenay, arenar  the platform: centre and radius (cm)
#     edge                    my distance to the drop, in cm
#     rivalx, rivaly          where the rival is
#     cliff1..cliffN == 1     that edge sensor sees the DROP
#     Shove the rival off the platform - first to 3 knockouts wins.
#
#  WHEELS  (set these every step, from -25 to 25)
#      25,  25  = forward, full speed      -25, -25 = backward
#      25, -25  = turn right in place      -25,  25 = turn left in place
#      12,  12  = forward at half speed
# ============================================================

# === EDITOR SETUP ==============================================
# The game SKIPS this whole block! It exists only so VS Code knows
# these names and stops drawing red lines under them.
# Do NOT write your own code inside this block.
front = 200; frontleft = 200; frontright = 200
left = 200; right = 200; backleft = 200; backright = 200
color = 0; bumper = 0; timer = 0; state = 0; movetime = 0; atgoal = 0
white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5
x = 0; y = 0; heading = 0; mytiles = 0; rivaltiles = 0; timeleft = 0
battery = 100; dockx = -1; docky = -1
dust = 0; dustmax = 0; dustfull = 0; dumpx = -1; dumpy = -1
personback = 60; personwait = 0; goalx = -1; goaly = -1; goalname = 0; goalsleft = 0
kitchen = 1; door = 2; sofa = 3; bedroom = 4; window = 5; table = 6
zonex = -1; zoney = -1; zoner = -1; inzone = 0; rivalinzone = 0; rivalx = -1; rivaly = -1
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
# HOW LONG IS A TURN?  timer counts steps, 10 steps = 1 second:
#     timer = 3   ->  0.3 s of turning  =  about  50 degrees
#     timer = 5   ->  0.5 s of turning  =  about  80 degrees
#     timer = 10  ->  1.0 s of turning  =  about 165 degrees
# Want the robot to turn further? Just use a BIGGER number in timer.
#
# Add your own elif branches below - the first one that is true wins.


# ---------- THE ROBOT LOGIC ----------

wheelleft = 25                   # by default: drive straight ahead, full speed
wheelright = 25

if timer > 0:                    # 1) am I still busy with the last move?
    timer -= 1
    if state == 2:               #    reversing in a curve (one wheel slower,
        wheelleft = -25          #    so we also rotate away and do not drive
        wheelright = -8          #    straight back into the same spot)
    elif state == 1:             #    turning right
        wheelleft = 18
        wheelright = -18
    else:                        #    turning left
        wheelleft = -18
        wheelright = 18

elif bumper == 1:                # 2) I TOUCHED something -> reverse for 0.4 s
    state = 2
    timer = 4
    wheelleft = -25
    wheelright = -25

elif front < 75:                 # 3) wall closer than 75 cm ahead
    state = 1                    #    -> back off, then turn right
    timer = 3                    #    timer = 3 -> turn 0.3 s (about 50 degrees)
    wheelleft = -10              #       use a bigger number to turn further!
    wheelright = -10

elif frontleft < 45:             # 4) something closer than 45 cm on my LEFT
    state = 1                    #    -> back off, then turn right
    timer = 3
    wheelleft = -10
    wheelright = -10

elif frontright < 45:            # 5) something closer than 45 cm on my RIGHT
    state = 1                    #    TRY THIS: change to -1 (turn left) and watch
    timer = 3                    #    the robot start to wobble and get stuck.
    wheelleft = -10              #    Turning the same way every time is steadier!
    wheelright = -10

elif color == purple:            # 6) the small PURPLE rug is right ahead
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

else:                            # 7) nothing in the way -> full speed ahead
    wheelleft = 25
    wheelright = 25
