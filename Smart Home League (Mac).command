#!/bin/bash
# ============================================================
#  Smart Home League — macOS launcher
#  Double-click me (or: bash "Smart Home League (Mac).command")
#  If macOS refuses to open me: System Settings → Privacy &
#  Security → "Open Anyway", or run the bash line above once.
# ============================================================
cd "$(dirname "$0")"

PORT=8000
URL="http://127.0.0.1:$PORT/index.html"

# find python3 (every modern macOS offers it; the first run may ask to
# install Apple's command line tools — accept once and re-run me)
PY="$(command -v python3 || true)"
if [ -z "$PY" ]; then
  echo "python3 was not found. Install it once with:  xcode-select --install"
  echo "…or from https://www.python.org/downloads/  — then run me again."
  read -r -p "Press Enter to close."
  exit 1
fi

# serve the game from this folder
"$PY" -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1

# open an app-style window if Chrome/Edge is around, else the default browser
if [ -d "/Applications/Google Chrome.app" ]; then
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
      --app="$URL" --user-data-dir="$TMPDIR/shl-appwindow" \
      --no-first-run --no-default-browser-check >/dev/null 2>&1
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
      --app="$URL" --user-data-dir="$TMPDIR/shl-appwindow" \
      --no-first-run --no-default-browser-check >/dev/null 2>&1
else
  open "$URL"
  echo "Smart Home League is running — close this window to stop the game."
  wait $SRV
fi
