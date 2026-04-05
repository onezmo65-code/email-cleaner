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
if not exist "%~dp0backend\node_modules" (
    echo  Setup has not been run yet.
    echo  Please double-click SETUP.bat first.
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0frontend\node_modules" (
    echo  Frontend setup incomplete.
    echo  Please double-click SETUP.bat first.
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

