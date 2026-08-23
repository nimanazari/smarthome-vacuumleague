# type: ignore
# cspell:ignore frontleft frontright backleft backright wheelleft wheelright mytiles rivaltiles
# ============================================================
#  EXAMPLE — WALL FOLLOWING with the distance sensors
#  Keeps the wall on the RIGHT side and sweeps the edge of the room.
#  Uses: front, right, bumper, timer
# ============================================================

# === EDITOR SETUP ==============================================
# The game SKIPS this whole block! It exists only so VS Code knows
# these names and stops drawing red lines under them.
front = 200; frontleft = 200; frontright = 200
left = 200; right = 200; backleft = 200; backright = 200
color = 0; bumper = 0; timer = 0; state = 0; movetime = 0
white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5
x = 0; y = 0; heading = 0; mytiles = 0; rivaltiles = 0; timeleft = 0
wheelleft = 0; wheelright = 0
# === END EDITOR SETUP ==========================================

wheelleft = 25                  # default: straight ahead
wheelright = 25

if timer > 0:                   # finishing a turn away from a bump
    timer -= 1
    wheelleft = -18
    wheelright = 18

elif bumper == 1:               # touched something -> spin left for 0.4 s
    timer = 4
    wheelleft = -18
    wheelright = 18

elif front < 60:                # wall straight ahead -> turn left now
    wheelleft = -18
    wheelright = 18

elif right > 70:                # lost the wall -> curve right to find it
    wheelleft = 25
    wheelright = 13

elif right < 35:                # hugging too close -> curve away a little
    wheelleft = 13
    wheelright = 25
