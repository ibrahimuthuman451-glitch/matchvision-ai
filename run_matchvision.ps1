# MATCHVISION AI — Windows PowerShell Execution Script
# For Windows 10/11: C:\Users\USER\Desktop\matchvision AI

param (
    [string]$Mode = "test",
    [string]$Video = "sample_match.mp4",
    [string]$Output = "tracked_match.mp4",
    [string]$ExportJson = "match.json"
)

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "MATCHVISION AI — NEXT-GEN FOOTBALL INTELLIGENCE ENGINE" -ForegroundColor Green
Write-Host "Local Directory: $PSScriptRoot" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan

# Check Python installation
$pythonCmd = "python"
if (-not (Get-Command $pythonCmd -ErrorAction SilentlyContinue)) {
    $pythonCmd = "py"
}

if (-not (Get-Command $pythonCmd -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not found in PATH. Please install Python 3.10+ from python.org"
    exit 1
}

# Check virtual environment
if (Test-Path "$PSScriptRoot\.venv\Scripts\Activate.ps1") {
    Write-Host "[*] Activating virtual environment .venv..." -ForegroundColor Gray
    & "$PSScriptRoot\.venv\Scripts\Activate.ps1"
}

if ($Mode -eq "test") {
    Write-Host "[*] Running MatchVision AI Automated Test Suite..." -ForegroundColor Cyan
    & $pythonCmd main.py --mode test
}
elseif ($Mode -eq "process") {
    Write-Host "[*] Processing match video: $Video -> $Output" -ForegroundColor Cyan
    & $pythonCmd main.py --mode process --video $Video --output $Output --export-json $ExportJson
}
elseif ($Mode -eq "demo") {
    Write-Host "[*] Running synthetic demo match and exporting artefact..." -ForegroundColor Cyan
    & $pythonCmd main.py --mode demo --export-json "demo_match.json"
}
elseif ($Mode -eq "web") {
    Write-Host "[*] Launching MatchVision web workspace on http://localhost:3000 ..." -ForegroundColor Cyan
    npm run dev
}
else {
    Write-Host "Usage: .\run_matchvision.ps1 -Mode [test|demo|process|web] [-Video path.mp4] [-ExportJson match.json]" -ForegroundColor Yellow
}
