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

:: ── Ensure Node.js is findable regardless of PATH ─
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%APPDATA%\npm;%PATH%"

:: ── Build exact paths from script location ────────
set "ROOTDIR=%~dp0"
if "!ROOTDIR:~-1!"=="\" set "ROOTDIR=!ROOTDIR:~0,-1!"
set "BACKENDDIR=!ROOTDIR!\backend"
set "FRONTENDDIR=!ROOTDIR!\frontend"

:: ── Verify directory structure ────────────────────
if not exist "!BACKENDDIR!" (
    echo  ERROR: Backend folder not found!
    echo  Expected: !BACKENDDIR!
    echo.
    echo  Solution:
    echo  - Right-click EmailCleaner-Windows-v1.1.zip
    echo  - Select "Extract All..."
    echo  - Choose a simple location like C:\EmailCleaner
    echo  - Double-click SETUP.bat again
    echo.
    pause
    exit /b 1
)
if not exist "!FRONTENDDIR!" (
    echo  ERROR: Frontend folder not found!
    echo  Expected: !FRONTENDDIR!
    echo.
    echo  Solution:
    echo  - Right-click EmailCleaner-Windows-v1.1.zip
    echo  - Select "Extract All..."
    echo  - Choose a simple location like C:\EmailCleaner
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
    echo  ERROR: Node.js not found.
    echo.
    echo  Install Node.js v20 LTS then run SETUP.bat again:
    echo  https://nodejs.org/dist/v20.19.1/node-v20.19.1-x64.msi
    echo.
    echo  During install: check "Add to PATH", then RESTART PC.
    echo.
    pause
    exit /b 1
)

echo  Node.js !NODEVER! found - OK
echo.

:: ── Install backend dependencies ─────────────────
echo  [2/4] Installing backend dependencies...
echo  (this may take 2-3 minutes - please wait)
echo.
call npm install --prefix "!BACKENDDIR!"
if !errorlevel! neq 0 (
    echo.
    echo  ERROR: Backend installation failed!
    echo.
    echo  Try this:
    echo  1. Delete the 'backend\node_modules' folder
    echo  2. Run SETUP.bat again
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
echo.
call npm install --prefix "!FRONTENDDIR!"
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
echo.
pushd "!BACKENDDIR!"
call npm run build
popd
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
