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
echo Keep this window open while using the app.
echo.

start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$url='http://127.0.0.1:%PORT%/'; for($i=0;$i -lt 40;$i++){try{Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1 ^| Out-Null; Start-Process $url; exit}catch{}; Start-Sleep -Milliseconds 250}"

%PY% -m http.server %PORT% --bind 127.0.0.1
set "ERR=%ERRORLEVEL%"

echo.
if not "%ERR%"=="0" (
    echo [ERROR] Server stopped with code %ERR%.
    echo Port %PORT% may already be in use.
    pause
) else (
    echo Server stopped.
    pause
)
endlocal
