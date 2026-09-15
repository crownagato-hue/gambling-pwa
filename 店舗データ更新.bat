@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul
echo ============================================
echo   P-WORLD 店舗データ更新
echo ============================================
echo.
echo 都道府県 → 市区郡ページから店舗名を取得します。
echo.
where py >nul 2>&1
if not errorlevel 1 goto RUN_PY
where python >nul 2>&1
if not errorlevel 1 goto RUN_PYTHON
echo [ERROR] Python 3 が見つかりません。
goto END
:RUN_PY
py -3 update_store_data.py 0.12
goto END
:RUN_PYTHON
python update_store_data.py 0.12
:END
echo.
pause
