@echo off
setlocal
cd /d "%~dp0"
set "PORT=8765"

where py >nul 2>&1
if not errorlevel 1 goto USE_PY
where python >nul 2>&1
if not errorlevel 1 goto USE_PYTHON

echo ERROR: Python 3 was not found.
pause
exit /b 1

:USE_PY
start "Gambling PWA Server" /D "%~dp0" cmd /k "py -3 -m http.server %PORT%"
goto OPEN

:USE_PYTHON
start "Gambling PWA Server" /D "%~dp0" cmd /k "python -m http.server %PORT%"
goto OPEN

:OPEN
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:%PORT%/index.html"
echo Browser opened.
echo Keep the server window open while using the app.
exit /b 0
