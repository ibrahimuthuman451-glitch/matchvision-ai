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

echo ==============================================================
echo Setup Complete! You can now run:
echo   powershell -ExecutionPolicy Bypass -File .\run_matchvision.ps1
echo ==============================================================
pause
