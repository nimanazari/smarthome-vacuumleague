# type: ignore
# cspell:ignore frontleft frontright backleft backright wheelleft wheelright mytiles rivaltiles atgoal distto angleto stopgoto timeleft
# ============================================================
#  GOTO PATROL  -  the position sensor (GPS) in action.
#
#  The map is centimetres: the BOTTOM-LEFT corner is (0,0),
#  x grows to the right, y grows UP. On the standard map the
#  far corner is (1000,1000) and the centre is (500,500).
#
#  goto(x, y)  drives to that point on the STRAIGHT line and
#  stops there by itself. atgoal turns 1 when it arrives.
#  goto does NOT dodge obstacles - the bumper code below
#  backs off and re-aims whenever we hit something.
# ============================================================

# === EDITOR SETUP ==============================================
# The game SKIPS this whole block! It exists only so VS Code knows
# these names and stops drawing red lines under them.
front = 200; frontleft = 200; frontright = 200
left = 200; right = 200; backleft = 200; backright = 200
color = 0; bumper = 0; timer = 0; state = 0; movetime = 0; atgoal = 0
white = 0; red = 1; blue = 2; green = 3; black = 4; purple = 5
x = 0; y = 0; heading = 0; mytiles = 0; rivaltiles = 0; timeleft = 0
wheelleft = 0; wheelright = 0
# === END EDITOR SETUP ==========================================


# ---------- patrol the four corners, forever ----------
# state remembers which corner we are heading to (1..4).

if state == 0:                   # first step of the match -> aim corner 1
    state = 1
    goto(150, 150)

elif atgoal == 1:                # arrived -> aim the NEXT corner
    state = state + 1
    if state == 2:
        goto(150, 850)           # top-left area
    elif state == 3:
        goto(850, 850)           # top-right area
    elif state == 4:
        goto(850, 150)           # bottom-right area
    else:
        state = 1
        goto(150, 150)           # back to the start corner

# ---------- safety: goto drives a straight line, it does not dodge ----------
if bumper == 1:                  # hit furniture / wall / cat / dog / rival
    stopgoto()                   # take the wheels back...
    backward(1)                  # ...back off for a second
elif timer > 0:                  # (nothing else to do - goto is steering)
    timer -= 1

# after the back-off ends, aim the same corner again
if bumper == 0 and atgoal == 0 and state > 0:
    if distto(150, 150) > 0 and state == 1:
        goto(150, 150)
    elif state == 2:
        goto(150, 850)
    elif state == 3:
        goto(850, 850)
    elif state == 4:
        goto(850, 150)
