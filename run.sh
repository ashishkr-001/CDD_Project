#!/bin/bash
# SpotShare - Start both backend and frontend concurrently

set -e

# Project root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "=========================================="
echo " Starting SpotShare (Backend + Frontend) "
echo "=========================================="

# Cleanup function when pressing Ctrl+C or on exit
cleanup() {
    echo ""
    echo "Shutting down SpotShare servers..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    # Extra safety: kill any leftover processes on the ports
    lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    lsof -ti :5173 | xargs kill -9 2>/dev/null || true
    echo "SpotShare stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Free ports if already in use
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

# 1. Start Backend
echo "Starting Backend (FastAPI on http://localhost:8000)..."
cd "$BACKEND_DIR"
python3 -m uvicorn main:app --port 8000 --reload &
BACKEND_PID=$!

# 2. Start Frontend
echo "Starting Frontend (Vite on http://localhost:5173)..."
cd "$FRONTEND_DIR"
node ./node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

echo ""
echo " SpotShare is up and running!"
echo "   - Frontend:  http://localhost:5173"
echo "   - Backend:   http://localhost:8000"
echo "   - API Docs:  http://localhost:8000/docs"
echo " Press [Ctrl+C] to stop both."
echo ""

# Wait for both background processes
wait $BACKEND_PID $FRONTEND_PID

