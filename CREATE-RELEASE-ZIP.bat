@echo off
title Creating Release ZIP...
echo.
echo Creating EmailCleaner-Windows-v1.1.zip ...
echo.

:: Use short path to avoid spaces problem
set "ROOT=C:\Projects\EmailCleaner-src"
set "OUT=C:\Projects\Email Cleaner\EmailCleaner-Windows-v1.1.zip"
set "SRC=C:\Projects\Email Cleaner"

:: Clean old build
if exist "%ROOT%" rmdir /s /q "%ROOT%"
mkdir "%ROOT%"

:: Create exclude list for xcopy
echo email-cleaner.db > "%TEMP%\xcopy-exclude.txt"
echo email-cleaner.db-shm >> "%TEMP%\xcopy-exclude.txt"
echo email-cleaner.db-wal >> "%TEMP%\xcopy-exclude.txt"
echo credentials.json >> "%TEMP%\xcopy-exclude.txt"
echo token.json >> "%TEMP%\xcopy-exclude.txt"
echo .env >> "%TEMP%\xcopy-exclude.txt"

:: Copy backend (no node_modules, no db)
echo Copying backend...
xcopy "%SRC%\backend" "%ROOT%\backend\" /E /I /Q /EXCLUDE:"%TEMP%\xcopy-exclude.txt"
if exist "%ROOT%\backend\node_modules" rmdir /s /q "%ROOT%\backend\node_modules"

:: Copy frontend (no node_modules)
echo Copying frontend...
xcopy "%SRC%\frontend" "%ROOT%\frontend\" /E /I /Q
if exist "%ROOT%\frontend\node_modules" rmdir /s /q "%ROOT%\frontend\node_modules"

:: Copy root files
echo Copying setup files...
copy "%SRC%\SETUP.bat"        "%ROOT%\SETUP.bat"
copy "%SRC%\START.bat"        "%ROOT%\START.bat"
copy "%SRC%\HOW-TO-START.txt" "%ROOT%\HOW-TO-START.txt"
copy "%SRC%\OAUTH_SETUP.md"   "%ROOT%\OAUTH_SETUP.md"
copy "%SRC%\package.json"     "%ROOT%\package.json"

:: Delete old zip
if exist "%OUT%" del "%OUT%"

:: Zip the clean folder
echo Compressing...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path 'C:\Projects\EmailCleaner-src\*' -DestinationPath 'C:\Projects\Email Cleaner\EmailCleaner-Windows-v1.1.zip'"

:: Cleanup
rmdir /s /q "%ROOT%"
del "%TEMP%\xcopy-exclude.txt"

echo.
echo ============================================
echo  DONE: EmailCleaner-Windows-v1.1.zip ready
echo ============================================
echo.
echo Upload to GitHub:
echo 1. Go to github.com/onezmo65-code/email-cleaner/releases
echo 2. Click pencil on v1.1
echo 3. Delete old EmailCleaner-Windows-v1.1.zip asset
echo 4. Drag new ZIP into Assets
echo 5. Click Update release
echo.
pause
