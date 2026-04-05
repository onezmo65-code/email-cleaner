@echo off
setlocal enabledelayedexpansion
title Email Cleaner
color 0A
echo.
echo  ================================================
echo     EMAIL CLEANER - Starting...
echo  ================================================
echo.

:: ── Check setup was run ───────────────────────────
if not exist "%~dp0.setupdone" (
    echo  ERROR: Setup has not been completed yet!
    echo.
    echo  Please follow these steps:
    echo.
    echo  1. Open the folder containing these files
    echo  2. Double-click SETUP.bat
    echo  3. Wait for setup to complete (2-5 minutes)
    echo  4. Then come back and run START.bat
    echo.
    echo  If you already ran SETUP.bat:
    echo  - Make sure you waited for it to finish
    echo  - Check that both backend and frontend installed
    echo  - Try running SETUP.bat again
    echo.
    pause
    exit /b 1
)

:: ── Start backend ─────────────────────────────────
echo  Starting backend server...
start "Email Cleaner - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 2 /nobreak >nul

:: ── Start frontend ────────────────────────────────
echo  Starting frontend development server...
start "Email Cleaner - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >nul

:: ── Wait then open browser ────────────────────────
echo  Opening Email Cleaner in your browser...
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo  ================================================
echo     Email Cleaner is now running!
echo  ================================================
echo.
echo  Your browser should open to:
echo    http://localhost:5173
echo.
echo  If the page doesn't load in 10 seconds,
echo  manually visit: http://localhost:5173
echo.
echo  TO STOP: Close the two black terminal windows
echo           labeled "Backend" and "Frontend"
echo.
pause


