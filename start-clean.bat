@echo off
echo Cleaning up any existing Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting Gantt Chart Application...
echo.

echo Starting Backend Server on port 3001...
start "Gantt Backend" cmd /k "cd /d C:\Users\zhend\Darrell\GnattChart1st\backend && node server.js"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo Starting Frontend on port 3000...
start "Gantt Frontend" cmd /k "cd /d C:\Users\zhend\Darrell\GnattChart1st\frontend && npm run dev"

echo.
echo Services are starting...
echo Backend API: http://localhost:3001
echo Frontend App: http://localhost:3000
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000