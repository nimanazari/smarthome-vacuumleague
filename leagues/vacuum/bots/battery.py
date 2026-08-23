# type: ignore
# cspell:ignore frontleft frontright backleft backright wheelleft wheelright mytiles rivaltiles atgoal distto angleto stopgoto timeleft dockx docky
# ============================================================
#  BATTERY RUNNER  -  for the U19 league.
#
#  In U19 the robot runs on a battery:
#     battery        100 -> 0   (100% is about 60 s of full speed)
#     dockx, docky   the charging station, in cm - it has a FIXED
#                    home by the wall, the same in every match
#
#  Park ON the pad and it refills at +25% per second.
#  An EMPTY battery STOPS the robot dead, right where it
#  stands, for the rest of the match - so the real skill
#  is leaving for the dock in time, every time.
#
#  The 10 s "stuck" watchdog is paused while you charge, but it
#  is back the moment you hit 100% - so do not camp on the pad.
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
# ============================================================

# === EDITOR SETUP ==============================================
# The game SKIPS this whole block! It exists only so VS Code knows
# these names and stops drawing red lines under them.
front = 200; frontleft = 200; frontright = 200
left = 200; right = 200; backleft = 200; backright = 200
color = 0; bumper = 0; timer = 0; state = 0; movetime = 0; atgoal = 0
white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5
x = 0; y = 0; heading = 0; mytiles = 0; rivaltiles = 0; timeleft = 0
battery = 100; dockx = -1; docky = -1
dust = 0; dustmax = 0; dustfull = 0; dumpx = -1; dumpy = -1
home = 0; needed = 0; flip = 0
wheelleft = 0; wheelright = 0
# === END EDITOR SETUP ==========================================


# ---------- how far is home, and how low is too low? ----------
home = distto(dockx, docky)
needed = home / 25 + 25


# ---------- state 3: back out of whatever we hit ----------
if state == 3:
    if timer > 0:
        timer -= 1
        if flip < 1:             # the side picked at the moment of the bump
            wheelleft = -22
            wheelright = -8
        else:
            wheelleft = -8
            wheelright = -22
    else:
        state = 4                # clear of it -> now slide ALONG it
        timer = 12


# ---------- state 4: sidestep along the obstacle, then retry ----------
elif state == 4:
    if bumper == 1:              # hit something ELSE mid-sidestep? back out
        if frontleft > frontright:
            flip = 0             # again toward whichever side is open NOW
        else:
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
        else:
            wheelleft = 24
            wheelright = 8
    else:
        state = 1                # try the trip home again from HERE
        timer = 200              # fresh 20-second deadline
        goto(dockx, docky)


# ---------- state 2: on the pad, drinking ----------
elif state == 2:
    wheelleft = 0                # do NOT roll off the pad
    wheelright = 0
    if battery > 95:
        state = 0                # full -> back to work


# ---------- state 1: driving home ----------
elif state == 1:
    timer -= 1
    if bumper == 1 or timer <= 0:
        # hit something - or the trip went STALE (20 s without arriving).
        # Either way: stop, back out toward the open side, try fresh.
        stopgoto()
        if frontleft > frontright:
            flip = 0             # more room to the LEFT -> escape that way
        else:
            flip = 1             # more room to the RIGHT
        state = 3
        timer = 10
        wheelleft = -20
        wheelright = -8
    elif home < 25:              # close enough: stop and let it charge
        stopgoto()
        state = 2
        wheelleft = 0
        wheelright = 0
    # else: goto is steering, leave the wheels alone


# ---------- state 0: cleaning ----------
else:
    # time to head home? Two triggers: the sensible one, and the emergency one.
    if dockx > 0 and battery < needed:
        state = 1
        timer = 200              # a trip gets 20 seconds, then we rethink -
        goto(dockx, docky)       # long enough to cross the slow rug honestly
    elif dockx > 0 and battery < 20:
        state = 1
        timer = 200
        goto(dockx, docky)

    elif front < 25 or bumper == 1:      # something right ahead -> turn away
        wheelleft = 25
        wheelright = -25
    elif frontleft < frontright:         # more room on the right
        wheelleft = 25
        wheelright = 12
    elif frontright < frontleft:         # more room on the left
        wheelleft = 12
        wheelright = 25
    else:
        wheelleft = 25                   # clear -> full speed, clean!
        wheelright = 25
