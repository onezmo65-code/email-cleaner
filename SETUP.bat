@echo off
:: Email Cleaner - First Time Setup
:: Publisher: Originatti
:: Version: 1.1
setlocal enabledelayedexpansion
title Email Cleaner - First Time Setup
color 0A
cls
echo.
echo  ================================================
echo     EMAIL CLEANER - First Time Setup
echo  ================================================
echo.
echo  This will install dependencies for the backend
echo  and frontend. Please be patient - this might
echo  take 3-5 minutes on first run.
echo.
echo  Do NOT close this window until setup completes!
echo.

:: Verify directory structure
if not exist "%~dp0backend" (
    echo  ERROR: Backend folder not found!
    echo.
    echo  This usually means the ZIP file was not
    echo  extracted correctly.
    echo.
    echo  Solution:
    echo  - Right-click EmailCleaner-Windows-v1.1.zip
    echo  - Select "Extract All..."
    echo  - Choose a simple location like C:\Apps\EmailCleaner
    echo  - Double-click SETUP.bat again
    echo.
    pause
    exit /b 1
)
if not exist "%~dp0frontend" (
    echo  ERROR: Frontend folder not found!
    echo.
    echo  This usually means the ZIP file was not
    echo  extracted correctly.
    echo.
    echo  Solution:
    echo  - Right-click EmailCleaner-Windows-v1.1.zip
    echo  - Select "Extract All..."
    echo  - Choose a simple location like C:\Apps\EmailCleaner
    echo  - Double-click SETUP.bat again
    echo.
    pause
    exit /b 1
)

:: ── Check Node.js ────────────────────────────────
echo  [1/4] Checking Node.js...
for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODEVER=%%v"

if "!NODEVER!"=="" (
    echo.
    echo  WARNING: Node.js does not appear to be in your PATH
    echo.
    echo  However, you might already have it installed.
    echo.
    echo  Options:
    echo  1. If you have Node.js installed:
    echo     - Close all command prompts
    echo     - Restart your computer (to reload PATH)
    echo     - Run SETUP.bat again
    echo.
    echo  2. If you don't have Node.js:
    echo     - Go to https://nodejs.org/en/download
    echo     - Download the LTS version
    echo     - Run the installer with admin rights
    echo     - Select "Add to PATH" during installation
    echo.
    echo  3. If this keeps happening:
    echo     - Press 'C' to continue anyway (might work)
    echo     - Press any other key to exit
    echo.
    choice /c C /n /t 10 /d C >nul
    if !errorlevel! neq 1 (
        exit /b 1
    )
    echo.
    echo  Continuing setup (hoping Node.js works)...
    echo.
) else (
    echo  Node.js !NODEVER! found - OK
    echo.
)


:: ── Install backend dependencies ─────────────────
echo  [2/4] Installing backend dependencies...
echo  (this may take 2-3 minutes - please wait)
cd /d "%~dp0backend"
echo.
call npm install
if !errorlevel! neq 0 (
    echo.
    echo  ERROR: Backend installation failed!
    echo.
    echo  Try this:
    echo  1. Delete the 'backend\node_modules' folder
    echo  2. Run SETUP.bat again
    echo.
    echo  If the error persists, contact support.
    echo.
    pause
    exit /b 1
)
echo.
echo  Backend dependencies installed - OK
echo.

:: ── Install frontend dependencies ────────────────
echo  [3/4] Installing frontend dependencies...
echo  (this may take 2-3 minutes - please wait)
cd /d "%~dp0frontend"
echo.
call npm install
if !errorlevel! neq 0 (
    echo.
    echo  ERROR: Frontend installation failed!
    echo.
    echo  Try this:
    echo  1. Delete the 'frontend\node_modules' folder
    echo  2. Run SETUP.bat again
    echo.
    pause
    exit /b 1
)
echo.
echo  Frontend dependencies installed - OK
echo.

:: ── Build backend ────────────────────────────────
echo  [4/4] Building backend...
cd /d "%~dp0backend"
echo.
call npm run build
if !errorlevel! neq 0 (
    echo.
    echo  WARNING: Backend build had issues
    echo  This is usually not critical. Continuing anyway...
    echo.
    timeout /t 2 /nobreak >nul
)
echo.
echo  Build complete - OK
echo.

:: ── Done ──────────────────────────────────────────
cls
echo.
echo  ================================================
echo     SETUP COMPLETE!
echo  ================================================
echo.
echo  Email Cleaner is ready to use!
echo.
echo  NEXT STEP:
echo.
echo  Close this window and double-click START.bat
echo  to launch Email Cleaner.
echo.
echo.
pause


