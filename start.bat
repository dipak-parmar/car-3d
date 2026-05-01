@echo off
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     NEON VELOCITY - Live Server          ║
echo  ║     Opening: http://localhost:8000       ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Try Python first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Python found. Starting server on port 8000...
    start "" "http://localhost:8000"
    python -m http.server 8000
    goto :end
)

:: Try Python3
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Python3 found. Starting server on port 8000...
    start "" "http://localhost:8000"
    python3 -m http.server 8000
    goto :end
)

:: Try npx serve
npx --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] NPX found. Starting server on port 8000...
    start "" "http://localhost:8000"
    npx serve . -p 8000
    goto :end
)

echo [ERROR] Neither Python nor Node.js found!
echo Please install Python from https://python.org
echo Or install Node.js from https://nodejs.org

:end
pause
