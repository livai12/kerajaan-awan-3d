@echo off
echo ======================================================
echo Memulai Kerajaan Awan 3D: SOKA Week 10
echo ======================================================
cd /d "%~dp0"

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Menjalankan local server via Node.js...
    node server.js
) else (
    echo Node.js tidak terdeteksi, membuka index.html langsung...
    start "" "index.html"
)
pause

