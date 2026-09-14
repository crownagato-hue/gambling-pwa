@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

echo ============================================
echo  ギャンブル収支管理PWA Ver8.16
necho  P-WORLD 機種データ更新ツール
echo ============================================
echo.

where py >nul 2>&1
if %errorlevel%==0 (
  py -3 update_machine_data.py
  goto END
)

where python >nul 2>&1
if %errorlevel%==0 (
  python update_machine_data.py
  goto END
)

echo Python 3 が見つかりません。
echo https://www.python.org/downloads/ からPython 3をインストールしてください。

:END
echo.
echo machine-data.json が更新されたら、PWAを再起動してください。
pause
endlocal
