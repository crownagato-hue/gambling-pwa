@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

echo ============================================
echo   P-WORLD 機種データ更新 Ver8.18
echo ============================================
echo.
echo P-WORLDの最新機種情報を取得します。
echo ※機種インデックスの「○件」は取得・判定に使用しません。
echo 1～10ページ：導入前機種を除外してすべて取得
echo 11～20ページ：機種詳細ページの設置店300店舗以上
echo 21～30ページ：機種詳細ページの設置店500店舗以上
echo.
echo 機種詳細ページを多数取得するため、完了まで時間がかかる場合があります。
echo 取得失敗時は machine-data.json を変更しません。
echo.

where py >nul 2>&1
if %errorlevel%==0 (
  py -3 update_machine_data.py --pages 30
  set "RC=%errorlevel%"
  goto END
)

where python >nul 2>&1
if %errorlevel%==0 (
  python update_machine_data.py --pages 30
  set "RC=%errorlevel%"
  goto END
)

echo [ERROR] Python 3 が見つかりません。
echo https://www.python.org/downloads/ から Python 3 をインストールしてください。
set "RC=9009"

:END
echo.
if "%RC%"=="0" (
  echo [OK] machine-data.json の更新が完了しました。
) else (
  echo [NG] 更新に失敗しました。既存の machine-data.json は保持されています。
  echo エラーコード: %RC%
)
echo.
pause
exit /b %RC%
