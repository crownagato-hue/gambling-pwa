@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul
echo ============================================
echo   P-WORLD 機種データ更新
echo ============================================
echo.
echo 1～10ページ：導入前機種を除外して取得
echo 11～20ページ：設置店300店舗以上
echo 21～30ページ：設置店500店舗以上
echo.
where py >nul 2>&1
if not errorlevel 1 goto RUN_PY
where python >nul 2>&1
if not errorlevel 1 goto RUN_PYTHON
echo [ERROR] Python 3 が見つかりません。
goto END
:RUN_PY
py -3 update_machine_data.py --pages 30
goto END
:RUN_PYTHON
python update_machine_data.py --pages 30
:END
echo.
pause
