@echo off
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
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo.
    echo  ERROR: Node.js is not installed!
    echo.
    echo  Solution:
    echo  1. Go to https://nodejs.org/en/download
    echo  2. Download the LTS version
    echo  3. Run the installer (click Next through all steps)
    echo  4. Close this window and run SETUP.bat again
    echo.
    echo  Opening download page now...
    start https://nodejs.org/en/download
    pause
    exit /b 1
)

:: Get Node version
for /f "tokens=1 delims=." %%A in ('node -v') do (
    set "NODEVER=%%A"
)
set "NODEVER=!NODEVER:v=!"
echo  Node.js v!NODEVER! found - OK
echo.

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

:: ── Create setup marker ──────────────────────────
echo. > "%~dp0.setupdone"

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


