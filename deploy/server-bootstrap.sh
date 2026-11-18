#!/usr/bin/env bash
# Server-side bootstrap used by deploy/windows/deploy-from-windows.ps1.
# Extracts an uploaded archive into INSTALL_PATH and runs the production deploy.
set -euo pipefail

ARCHIVE="${ARCHIVE:-}"
INSTALL_PATH="${INSTALL_PATH:-/opt/matchvision}"

say() { printf '\n[bootstrap] %s\n' "$*"; }

say "Checking Docker on $(hostname)"
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  cat >&2 <<'MSG'
[bootstrap] Docker Engine with the Compose v2 plugin is required on this server.
Ubuntu/Debian one-liner:
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"   # then reconnect
MSG
  exit 1
fi

if [ -n "$ARCHIVE" ]; then
  if [ ! -f "$ARCHIVE" ]; then
    echo "[bootstrap] Archive not found: $ARCHIVE" >&2
    exit 1
  fi
  say "Preparing $INSTALL_PATH"
  if [ -d "$INSTALL_PATH" ] && [ -w "$INSTALL_PATH" ]; then
    mkdir -p "$INSTALL_PATH"
  elif [ "$(id -u)" -eq 0 ]; then
    mkdir -p "$INSTALL_PATH"
  else
    sudo mkdir -p "$INSTALL_PATH"
    sudo chown "$(id -u):$(id -g)" "$INSTALL_PATH"
  fi
  say "Extracting $ARCHIVE"
  tar -xzf "$ARCHIVE" -C "$INSTALL_PATH"
fi

if [ ! -d "$INSTALL_PATH/deploy" ]; then
  echo "[bootstrap] $INSTALL_PATH/deploy is missing. Upload the repository archive first." >&2
  exit 1
fi

cd "$INSTALL_PATH/deploy"
if [ ! -f .env ]; then
  cp .env.example .env
  chmod 600 .env
  say "Created deploy/.env — add GEMINI_API_KEY later if needed"
fi
chmod +x deploy.sh

exec ./deploy.sh
