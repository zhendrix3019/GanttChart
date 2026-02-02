@echo off
:: Stop Gantt Chart Application
taskkill /F /IM node.exe >nul 2>&1
echo Application stopped.
timeout /t 2 >nul
exit
