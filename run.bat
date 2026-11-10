@echo off
echo ==========================================
echo  Starting SpotShare (Backend + Frontend)
echo ==========================================

echo Starting Backend (FastAPI on http://localhost:8000)...
start "SpotShare Backend (FastAPI)" cmd /k "cd backend && python -m uvicorn main:app --port 8000 --reload"

echo Starting Frontend (Vite on http://localhost:5173)...
start "SpotShare Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo SpotShare is starting up!
echo   - Frontend:  http://localhost:5173
echo   - Backend:   http://localhost:8000
echo   - API Docs:  http://localhost:8000/docs
echo ==========================================

