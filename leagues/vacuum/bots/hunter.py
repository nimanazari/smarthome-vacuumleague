# type: ignore
# cspell:ignore frontleft frontright backleft backright wheelleft wheelright mytiles rivaltiles
# ============================================================
#  EXAMPLE — TILE HUNTER
#  Sweeps fast, avoids the rugs, and when the round is almost over
#  it plays even more aggressively to steal tiles back.
#  Uses: all 3 front sensors, color, bumper, timeleft, timer + state
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

wheelleft = 25                   # default: sweep at full speed
wheelright = 25

if timer > 0:                    # keep the started move going
    timer -= 1
    if state == 2:               # reversing in a curve
        wheelleft = -25
        wheelright = -10
    elif state == 1:             # turning right
        wheelleft = 18
        wheelright = -18
    else:                        # turning left
        wheelleft = -18
        wheelright = 18

elif bumper == 1:                # touched something -> curve back 0.5 s
    state = 2
    timer = 5
    wheelleft = -25
    wheelright = -10

elif front < 65:                 # wall ahead -> back off + turn right
    state = 1
    timer = 4
    wheelleft = -12
    wheelright = -12

elif frontleft < 40:             # blocked on the left -> turn right
    state = 1
    timer = 3
    wheelleft = -10
    wheelright = -10

elif frontright < 40:            # blocked on the right -> turn LEFT
    state = -1
    timer = 3
    wheelleft = -10
    wheelright = -10

elif color == green or color == purple:      # rugs give no points - get out
    state = 2
    timer = 6
    wheelleft = -25
    wheelright = -10

elif timeleft < 30 and color == white:       # last 30 s: grab clean floor hard
    wheelleft = 25
    wheelright = 25
