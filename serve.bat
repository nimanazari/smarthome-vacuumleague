@echo off
rem ============================================================
rem  Smart Home League — double-click to play. NOTHING to install:
rem  uses Python if you have it, otherwise pure PowerShell.
rem  دوبار کلیک کن و بازی کن — پایتون داشتی با پایتون، نداشتی
rem  خودِ ویندوز (PowerShell) سرور می‌شود. هیچ نصبی لازم نیست.
rem ============================================================
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8801/
  python -m http.server 8801
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8801/
  py -m http.server 8801
  goto :eof
)
echo Python not found - starting the no-install PowerShell server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
