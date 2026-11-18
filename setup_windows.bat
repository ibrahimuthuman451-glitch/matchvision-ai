@echo off
echo ==============================================================
echo MATCHVISION AI - WINDOWS ENVIRONMENT SETUP
echo Local Directory: C:\Users\USER\Desktop\matchvision AI
echo ==============================================================

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH! Please install Python 3.10+ from python.org
    pause
    exit /b 1
)

echo [*] Creating virtual environment (.venv)...
python -m venv .venv

echo [*] Activating virtual environment...
call .venv\Scripts\activate.bat

echo [*] Upgrading pip...
python -m pip install --upgrade pip

echo [*] Installing required dependencies from requirements.txt...
pip install -r requirements.txt

echo [*] Running automated verification test suite...
python main.py --mode test

echo [*] Installing web platform dependencies (Node.js 24+ required)...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Node.js was not found. Install Node 24+ to run the web workspace.
) else (
    call npm ci
    call npm run build
)

echo ==============================================================
echo Setup Complete! You can now run:
echo   npm run dev            ^(web workspace on http://localhost:3000^)
echo   powershell -ExecutionPolicy Bypass -File .\run_matchvision.ps1 -Mode demo
echo ==============================================================
pause
