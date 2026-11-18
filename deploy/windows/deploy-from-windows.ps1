<#
.SYNOPSIS
  Deploy MatchVision AI from Windows to uthmaniy.co.com over SSH.

.DESCRIPTION
  Packages the repository (no git/GitHub login needed on the server), uploads it with scp,
  then runs deploy/server-bootstrap.sh remotely. Requires the Windows 10/11 OpenSSH client,
  tar.exe, and SSH access to the server.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\deploy-from-windows.ps1 -SshUser root

.EXAMPLE
  .\deploy-from-windows.ps1 -SshUser ubuntu -KeyPath C:\Users\PC\.ssh\id_ed25519
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$SshUser,
  [string]$SshHost = "uthmaniy.co.com",
  [string]$InstallPath = "/opt/matchvision",
  [string]$KeyPath = "",
  [string]$Archive = ""
)

$ErrorActionPreference = "Stop"

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing '$Name'. On Windows 10/11 enable 'OpenSSH Client' in Settings > Apps > Optional features."
  }
}

Require-Command ssh
Require-Command scp
Require-Command tar

$sshArgs = @("-o", "ConnectTimeout=15")
if ($KeyPath -ne "") { $sshArgs += @("-i", $KeyPath) }
$target = "$SshUser@$SshHost"

Write-Host "[1/4] Testing SSH access to $target ..." -ForegroundColor Cyan
& ssh @sshArgs $target "echo SSH_OK"
if ($LASTEXITCODE -ne 0) {
  throw "SSH failed. Check the username/key and that port 22 is reachable. Try: ssh $target"
}

Write-Host "[2/4] Checking Docker on the server ..." -ForegroundColor Cyan
$dockerState = (& ssh @sshArgs $target "if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then echo DOCKER_OK; else echo DOCKER_MISSING; fi").Trim()
if ($dockerState -ne "DOCKER_OK") {
  throw "Docker Compose is not installed on the server. Install it there first:  curl -fsSL https://get.docker.com | sudo sh"
}

if ($Archive -eq "") {
  Write-Host "[3/4] Packaging the repository ..." -ForegroundColor Cyan
  $repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $Archive = Join-Path ([System.IO.Path]::GetTempPath()) "matchvision-$stamp.tar.gz"
  # Only ship application files; node_modules, .git, local databases and demo videos stay out.
  $items = @(
    "Dockerfile", "docker-compose.yml", "package.json", "package-lock.json", "tsconfig.json",
    "vite.config.ts", "index.html", "main.py", "requirements.txt", "README.md", "metadata.json",
    ".dockerignore", ".env.example", "src", "public", "server", "pipeline", "ai", "config",
    "tests", "deploy", "samples"
  )
  Push-Location $repoRoot
  & tar -czf $Archive @items
  Pop-Location
  if ($LASTEXITCODE -ne 0) { throw "Packaging failed." }
}
else {
  Write-Host "[3/4] Using existing archive: $Archive" -ForegroundColor Cyan
}

$remoteArchive = "/tmp/matchvision-deploy.tar.gz"
$remoteScript = "/tmp/matchvision-bootstrap.sh"

Write-Host "[4/4] Uploading and deploying ..." -ForegroundColor Cyan
& scp @sshArgs $Archive "${target}:$remoteArchive"
if ($LASTEXITCODE -ne 0) { throw "Upload failed." }
& scp @sshArgs (Join-Path $PSScriptRoot "..\server-bootstrap.sh") "${target}:$remoteScript"
if ($LASTEXITCODE -ne 0) { throw "Upload of the bootstrap script failed." }

& ssh @sshArgs $target "INSTALL_PATH='$InstallPath' ARCHIVE='$remoteArchive' bash '$remoteScript'"
if ($LASTEXITCODE -ne 0) { throw "Remote deployment failed. Check the output above." }

Write-Host ""
Write-Host "Deployment command finished. Verify: https://$SshHost/api/health" -ForegroundColor Green
