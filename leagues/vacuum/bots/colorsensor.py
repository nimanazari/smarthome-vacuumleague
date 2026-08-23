# type: ignore
# cspell:ignore frontleft frontright backleft backright wheelleft wheelright mytiles rivaltiles
# ============================================================
#  EXAMPLE: reading the COLOUR SENSOR by name
#  Load this with the Load .py button and press Start.
#
#  >>>>>>  timer = 10  MEANS  1 SECOND  <<<<<<
#          your code runs 10 times every second
#
#  The colour sensor sits at the robot's NOSE and reads the floor
#  just AHEAD of it:
#     white   = floor ahead not cleaned yet  -> the points are there
#     red     = floor ahead was cleaned by the red robot
#     blue    = floor ahead was cleaned by the blue robot
#     green   = the BIG rug is ahead   (half speed, no points)
#     purple  = the SMALL rug is ahead (no points)
#     black   = a wall or furniture is right ahead
#
#  This file shows the SYNTAX. Beating the base code is your job:
#  try reacting to red / blue / white in smarter ways.
# ============================================================

# === EDITOR SETUP ==============================================
# The game SKIPS this whole block! It exists only so VS Code knows
# these names and stops drawing red lines under them.
# Do NOT write your own code inside this block.
front = 200; frontleft = 200; frontright = 200
left = 200; right = 200; backleft = 200; backright = 200
color = 0; bumper = 0; timer = 0; state = 0
white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5
x = 0; y = 0; heading = 0; mytiles = 0; rivaltiles = 0; timeleft = 0
wheelleft = 0; wheelright = 0
# === END EDITOR SETUP ==========================================

wheelleft = 25
wheelright = 25

if timer > 0:                # still finishing the last move
    timer -= 1
    wheelleft = 18
    wheelright = -18         # turn in place

elif front < 75 or frontleft < 45 or frontright < 45:
    timer = 3                # wall or furniture ahead -> back off, then turn
    wheelleft = -10
    wheelright = -10

elif color == purple:        # the small purple rug is ahead -> reverse away
    timer = 5
    wheelleft = -25
    wheelright = -8

elif color == green:         # the big green rug is ahead -> turn away from it
    timer = 4
    wheelleft = -10
    wheelright = -10

elif color == white:         # clean floor ahead -> points, full speed
    wheelleft = 25
    wheelright = 25

else:                        # red or blue ahead: already cleaned, keep moving
    wheelleft = 25
    wheelright = 25
