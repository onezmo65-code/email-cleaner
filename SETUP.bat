@echo off
setlocal enabledelayedexpansion
title Email Cleaner - First Time Setup
color 0A
echo.
echo  ================================================
echo     EMAIL CLEANER - First Time Setup
echo  ================================================
echo.

:: Verify directory structure
if not exist "%~dp0backend" (
    echo  ERROR: Backend folder not found at:
    echo  %~dp0backend
    echo.
    echo  Make sure you extracted the ZIP completely.
    echo.
    pause
    exit /b 1
)
if not exist "%~dp0frontend" (
    echo  ERROR: Frontend folder not found at:
    echo  %~dp0frontend
    echo.
    echo  Make sure you extracted the ZIP completely.
    echo.
    pause
    exit /b 1
)

:: ── Check Node.js ────────────────────────────────
echo  [1/4] Checking Node.js...
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo.
    echo  Node.js is not installed on this computer.
    echo.
    echo  Opening the Node.js download page in your browser...
    echo  - Download the version marked "LTS"
    echo  - Run the installer (click Next through all steps)
    echo  - Come back and double-click SETUP.bat again
    echo.
    start https://nodejs.org/en/download
    pause
    exit /b 1
)

:: ── Check Node version (warn if too new) ─────────
for /f "tokens=1 delims=." %%A in ('node -v') do (
    set "NODEVER=%%A"
)
set "NODEVER=!NODEVER:v=!"
if !NODEVER! GTR 22 (
    echo.
    echo  WARNING: You have Node.js v!NODEVER!.
    echo  Email Cleaner works best with Node.js v20 LTS.
    echo.
    echo  Opening correct download page...
    start https://nodejs.org/en/download
    echo  Install Node.js v20 LTS, then run SETUP.bat again.
    echo.
    pause
    exit /b 1
)
echo  Node.js v!NODEVER! - OK
echo.

:: ── Install backend dependencies ─────────────────
echo  [2/4] Installing backend (this may take 2-3 minutes)...
cd /d "%~dp0backend"
call npm install
if !errorlevel! neq 0 (
    echo.
    echo  ERROR: Backend install failed.
    echo  Please take a screenshot of this window and contact support.
    echo.
    pause
    exit /b 1
)
echo  Backend ready - OK
echo.

:: ── Install frontend dependencies ────────────────
echo  [3/4] Installing frontend (this may take 1-2 minutes)...
cd /d "%~dp0frontend"
call npm install
if !errorlevel! neq 0 (
    echo.
    echo  ERROR: Frontend install failed.
    echo  Please take a screenshot of this window and contact support.
    echo.
    pause
    exit /b 1
)
echo  Frontend ready - OK
echo.

:: ── Verify database ──────────────────────────────
echo  [4/4] Initializing database...
cd /d "%~dp0backend"
npm run build >nul 2>&1
echo  Database ready - OK
echo.

:: ── Done ──────────────────────────────────────────
echo  ================================================
echo     SETUP COMPLETE!
echo  ================================================
echo.
echo  Your Email Cleaner is ready to use.
echo.
echo  Next step: Double-click START.bat to open it.
echo.
pause

