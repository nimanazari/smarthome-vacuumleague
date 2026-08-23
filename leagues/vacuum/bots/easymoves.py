# type: ignore
# cspell:ignore frontleft frontright backleft backright wheelleft wheelright mytiles rivaltiles
# ============================================================
#  EXAMPLE — EASY MOVES + the colour sensor
#  One call = one whole move; the number is real SECONDS.
#  Uses: color, bumper, front, backward(), turnright()
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

wheelleft = 25                  # default: straight ahead, full speed
wheelright = 25

if color == purple:             # small rug ahead - it gives no points
    backward(1)

elif color == green:            # big rug ahead - it slows us down
    backward(2)

elif bumper == 1:               # hit something - back away for a second
    backward(1)

elif front < 50:                # wall ahead - spin right for 0.6 s
    turnright(0.6)
