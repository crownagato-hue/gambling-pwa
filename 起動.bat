@echo off
cd /d "%~dp0"
where py >nul 2>&1
if not errorlevel 1 goto py
where python >nul 2>&1
if not errorlevel 1 goto python
 echo Python 3 が見つかりません。
 pause
 exit /b 1
:py
start "収支管理サーバー" cmd /k "py -3 -m http.server 8765"
goto open
:python
start "収支管理サーバー" cmd /k "python -m http.server 8765"
:open
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8765/index.html"
exit /b 0
