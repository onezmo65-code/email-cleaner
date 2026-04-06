#!/bin/bash
# Email Cleaner - Application Launcher
# Publisher: Originatti
# Version: 1.1

ROOTDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKENDDIR="$ROOTDIR/backend"
FRONTENDDIR="$ROOTDIR/frontend"

echo ""
echo " ================================================"
echo "    EMAIL CLEANER - Starting..."
echo " ================================================"
echo ""

# ── Check setup was run ───────────────────────────
if [ ! -d "$BACKENDDIR/node_modules" ]; then
    echo " ERROR: Backend dependencies not installed!"
    echo ""
    echo " Setup did not complete successfully."
    echo ""
    echo " Fix:"
    echo "   bash SETUP.sh"
    echo ""
    exit 1
fi

if [ ! -d "$FRONTENDDIR/node_modules" ]; then
    echo " ERROR: Frontend dependencies not installed!"
    echo ""
    echo " Fix:"
    echo "   bash SETUP.sh"
    echo ""
    exit 1
fi

# ── Cleanup function (Ctrl+C stops both servers) ──
cleanup() {
    echo ""
    echo " Stopping Email Cleaner..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# ── Start backend ─────────────────────────────────
echo " Starting backend server..."
cd "$BACKENDDIR"
npm run dev &
BACKEND_PID=$!
sleep 2

# ── Start frontend ────────────────────────────────
echo " Starting frontend server..."
cd "$FRONTENDDIR"
npm run dev &
FRONTEND_PID=$!
sleep 3

# ── Open browser ──────────────────────────────────
echo " Opening Email Cleaner in your browser..."
sleep 2

if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:5173
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173 &
fi

echo ""
echo " ================================================"
echo "    Email Cleaner is now running!"
echo " ================================================"
echo ""
echo " Open your browser to: http://localhost:5173"
echo ""
echo " TO STOP: Press Ctrl+C in this window"
echo ""

# Keep running until Ctrl+C
wait $BACKEND_PID $FRONTEND_PID
