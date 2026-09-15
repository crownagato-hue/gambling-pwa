@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PORT=8765"
set "PY="

where py >nul 2>&1
if not errorlevel 1 set "PY=py -3"

if not defined PY (
    where python >nul 2>&1
    if not errorlevel 1 set "PY=python"
)

if not defined PY (
    echo [ERROR] Python was not found.
    echo Please install Python 3 and run this file again.
    pause
    exit /b 1
)

echo Python: %PY%
echo Starting local server on port %PORT%...
echo Browser will open automatically.
echo Keep this window open while using the app.
echo.

rem Start the HTTP server in a separate window so this launcher can open the browser.
start "Gambling PWA Server" cmd /c "%PY% -m http.server %PORT% --bind 127.0.0.1"

rem Give the server a moment to start.
timeout /t 1 /nobreak >nul

rem Open the app using the default browser.
start "" "http://127.0.0.1:%PORT%/"

if errorlevel 1 (
    echo.
    echo [ERROR] Could not open the browser automatically.
    echo Open this address manually:
    echo http://127.0.0.1:%PORT%/
    pause
    exit /b 1
)

echo Browser launch command sent.
echo.
echo If the app does not appear, open:
echo http://127.0.0.1:%PORT%/
echo.
pause
endlocal
