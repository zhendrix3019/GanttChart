@echo off
:: Gantt Chart Application Launcher
:: Double-click to start the application

:: Kill any existing Node processes
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: Start Backend (minimized)
start /MIN "GanttBackend" cmd /k "cd /d C:\Users\zhend\Darrell\FinalGannt\backend && node server.js"

:: Wait for backend
timeout /t 2 /nobreak >nul

:: Start Frontend (minimized)
start /MIN "GanttFrontend" cmd /k "cd /d C:\Users\zhend\Darrell\FinalGannt\frontend && npm run dev"
    
:: Wait for frontend
timeout /t 4 /nobreak >nul

:: Open browser
start http://localhost:3000

exit
