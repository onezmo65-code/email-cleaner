@echo off
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
    exit
)

:: ── Start backend ─────────────────────────────────
echo  Starting backend server...
start "Email Cleaner - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: ── Wait for backend ──────────────────────────────
echo  Waiting for backend to start...
timeout /t 5 /nobreak >nul

:: ── Start frontend ────────────────────────────────
echo  Starting frontend...
start "Email Cleaner - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: ── Wait then open browser ────────────────────────
echo  Opening Email Cleaner in browser...
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo  ================================================
echo     Email Cleaner is now running!
echo  ================================================
echo.
echo  Your browser should open automatically.
echo  If not, go to: http://localhost:5173
echo.
echo  To STOP the app: close the two black terminal
echo  windows labelled "Backend" and "Frontend".
echo.
pause
