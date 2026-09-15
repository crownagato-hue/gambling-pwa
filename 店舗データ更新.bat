@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul

echo ============================================
echo   P-WORLD 店舗データ更新 Ver8.28
echo ============================================
echo.
echo 都道府県 → 市区郡から探す → 各市区郡ページの順で
echo 店舗名だけを取得します。
echo 住所や料金情報は解析しません。
echo 取得にはインターネット接続が必要です。
echo 終了後もこの画面は閉じません。
echo.

where py >nul 2>&1
if not errorlevel 1 goto RUN_PY
where python >nul 2>&1
if not errorlevel 1 goto RUN_PYTHON

echo [ERROR] Python 3 が見つかりません。
set "RC=9009"
goto END

:RUN_PY
py -3 update_store_data.py 0.12
set "RC=%ERRORLEVEL%"
goto END

:RUN_PYTHON
python update_store_data.py 0.12
set "RC=%ERRORLEVEL%"

goto END

:END
echo.
if "%RC%"=="0" (
  echo ============================================
  echo [OK] 店舗データの更新が完了しました。
  echo ============================================
) else (
  echo ============================================
  echo [NG] 店舗データの更新に失敗しました。コード: %RC%
  echo 既存の店舗データは変更していません。
  echo ============================================
)
echo.
pause
exit /b %RC%
