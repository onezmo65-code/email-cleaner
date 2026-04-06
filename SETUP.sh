#!/bin/bash
# Email Cleaner - First Time Setup
# Publisher: Originatti
# Version: 1.1

# Get the directory this script lives in
ROOTDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKENDDIR="$ROOTDIR/backend"
FRONTENDDIR="$ROOTDIR/frontend"

echo ""
echo " ================================================"
echo "    EMAIL CLEANER - First Time Setup"
echo " ================================================"
echo ""
echo " Running from: $ROOTDIR"
echo ""
echo " This will install dependencies for the backend"
echo " and frontend. Please be patient - this might"
echo " take 3-5 minutes on first run."
echo ""
echo " Do NOT close this window until setup completes!"
echo ""

# ── Verify directory structure ────────────────────
if [ ! -d "$BACKENDDIR" ]; then
    echo " ERROR: Backend folder not found!"
    echo " Expected: $BACKENDDIR"
    echo ""
    echo " Solution:"
    echo " - Extract the ZIP to a simple location like ~/EmailCleaner"
    echo " - Run SETUP.sh from inside that folder"
    echo ""
    exit 1
fi

if [ ! -d "$FRONTENDDIR" ]; then
    echo " ERROR: Frontend folder not found!"
    echo " Expected: $FRONTENDDIR"
    echo ""
    echo " Solution:"
    echo " - Extract the ZIP to a simple location like ~/EmailCleaner"
    echo " - Run SETUP.sh from inside that folder"
    echo ""
    exit 1
fi

# ── Check Node.js ────────────────────────────────
echo " [1/4] Checking Node.js..."

if ! command -v node &> /dev/null; then
    echo ""
    echo " ERROR: Node.js is not installed or not in PATH."
    echo ""
    echo " Install Node.js v20 LTS:"
    echo ""
    echo " Ubuntu / Debian:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "   sudo apt-get install -y nodejs"
    echo ""
    echo " macOS (Homebrew):"
    echo "   brew install node@20"
    echo ""
    echo " Or download from: https://nodejs.org/en/download"
    echo ""
    echo " After installing Node.js, run this script again."
    echo ""
    exit 1
fi

NODEVER=$(node --version)
NODEMAJOR=$(echo "$NODEVER" | sed 's/v//' | cut -d. -f1)

if [ "$NODEMAJOR" -gt 22 ]; then
    echo ""
    echo " ERROR: Node.js $NODEVER is too new for this app."
    echo ""
    echo " Node.js v20 or v22 LTS is REQUIRED."
    echo " Version v24+ breaks the database component."
    echo ""
    echo " Install Node.js v20 LTS:"
    echo " Ubuntu/Debian:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "   sudo apt-get install -y nodejs"
    echo ""
    echo " macOS: brew install node@20"
    echo ""
    exit 1
fi

echo " Node.js $NODEVER found - OK"
echo ""

# ── Install backend dependencies ─────────────────
echo " [2/4] Installing backend dependencies..."
echo " (this may take 2-3 minutes - please wait)"
echo ""

npm install --prefix "$BACKENDDIR"
if [ $? -ne 0 ]; then
    echo ""
    echo " ERROR: Backend installation failed!"
    echo ""
    echo " Try this:"
    echo "   rm -rf \"$BACKENDDIR/node_modules\""
    echo "   bash SETUP.sh"
    echo ""
    exit 1
fi
echo ""
echo " Backend dependencies installed - OK"
echo ""

# ── Install frontend dependencies ────────────────
echo " [3/4] Installing frontend dependencies..."
echo " (this may take 2-3 minutes - please wait)"
echo ""

npm install --prefix "$FRONTENDDIR"
if [ $? -ne 0 ]; then
    echo ""
    echo " ERROR: Frontend installation failed!"
    echo ""
    echo " Try this:"
    echo "   rm -rf \"$FRONTENDDIR/node_modules\""
    echo "   bash SETUP.sh"
    echo ""
    exit 1
fi
echo ""
echo " Frontend dependencies installed - OK"
echo ""

# ── Build backend ────────────────────────────────
echo " [4/4] Building backend..."
echo ""

cd "$BACKENDDIR" && npm run build
if [ $? -ne 0 ]; then
    echo ""
    echo " WARNING: Backend build had issues."
    echo " This is usually not critical. Continuing anyway..."
    echo ""
fi
echo ""
echo " Build complete - OK"
echo ""

# ── Done ─────────────────────────────────────────
echo " ================================================"
echo "    SETUP COMPLETE!"
echo " ================================================"
echo ""
echo " Email Cleaner is ready to use!"
echo ""
echo " NEXT STEP:"
echo ""
echo "   bash START.sh"
echo ""
echo " Or if you made it executable:"
echo "   ./START.sh"
echo ""
