@echo off
cd /d "%~dp0"
echo Starting Gantt Chart Application...
echo.

echo Starting Backend Server...
start "Gantt Backend" cmd /k "cd backend && npm run dev"

echo Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak

echo Starting Frontend...
start "Gantt Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both services are starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
pause