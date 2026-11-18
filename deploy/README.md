# Deploying MatchVision AI to uthmaniy.co.com

Target host: `169.60.151.233` (the current A record for `uthmaniy.co.com`).
Stack: Docker + the production image + Caddy for automatic HTTPS.

## 1. Server prerequisites

- Ubuntu 22.04/24.04 (or any Linux host with Docker Engine 24+ and the Compose v2 plugin).
- Inbound TCP **80** and **443** allowed by the host firewall / IBM Cloud security group (443/UDP too for HTTP/3).
- DNS: `A uthmaniy.co.com -> 169.60.151.233` and `A www.uthmaniy.co.com -> 169.60.151.233`.
  (An apex `CNAME` is not valid for HTTPS issuance; use A/AAAA records.)
- Nothing else listening on ports 80/443 on that host. Check with `sudo ss -ltnp | grep -E ':80|:443'`.

```bash
# one-time host setup
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # re-login afterwards
```

## 2. First deployment

### From Windows (recommended)

The repository is **private**, so the server cannot clone it anonymously. The Windows script
packages the app, uploads it over SSH and bootstraps the deployment without any GitHub login
on the server:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows\deploy-from-windows.ps1 -SshUser root
```

See [`windows/README.md`](windows/README.md) for prerequisites, key-based auth and troubleshooting.

### On the server (if you already have the code there)

```bash
# Private repo: use a PAT or deploy key, or upload the archive from the Windows script
sudo mkdir -p /opt/matchvision && sudo chown "$USER" /opt/matchvision
git clone https://<PAT>@github.com/ibrahimuthuman451-glitch/matchvision-ai.git /opt/matchvision
cd /opt/matchvision/deploy
cp .env.example .env && chmod 600 .env     # add GEMINI_API_KEY if you want generative AI
./deploy.sh
```

`deploy.sh` pulls `ghcr.io/ibrahimuthuman451-glitch/matchvision-ai:latest` when available,
otherwise builds locally, waits for `/api/health`, then verifies the HTTPS endpoint.

First boot: Caddy obtains a Let's Encrypt certificate for both hostnames (needs DNS to be
live and port 80 reachable). This usually takes under a minute.

## 3. Verify

```bash
curl -fsS https://uthmaniy.co.com/api/health          # {"status":"ok",...}
curl -sI https://uthmaniy.co.com | head -3           # 200, HSTS header
```

Then open <https://uthmaniy.co.com>, create the workspace account (the first user becomes
workspace admin), and upload `samples/demo_match.json` in the match library to confirm the
full flow.

## 4. Updating

```bash
cd /opt/matchvision && git pull --ff-only
cd deploy && ./deploy.sh
```

Or push to `main`: the GitHub Actions workflow publishes a new image, and — if auto-deploy is
enabled — runs the same script over SSH.

## 5. Auto-deploy from GitHub Actions

The pipeline is provided at [`deploy/github/publish.yml`](github/publish.yml). It is **not** in
`.github/workflows/` yet because the automation token used to prepare this repository lacks
the GitHub `workflows` permission. Install it once with a token that has `workflow` scope
(or paste it in the GitHub UI under *Actions → New workflow*):

```bash
mkdir -p .github/workflows
cp deploy/github/publish.yml .github/workflows/publish.yml
git add .github/workflows/publish.yml && git commit -m "ci: enable publish and deploy"
git push
```

Once installed, the workflow:

1. verifies type-check, production build and the 6 Python suites,
2. builds and pushes `ghcr.io/ibrahimuthuman451-glitch/matchvision-ai` (latest + commit SHA),
3. optionally deploys over SSH.

Enable step 3 under **Settings → Secrets and variables → Actions**:

| Kind | Name | Value |
| --- | --- | --- |
| Variable | `DEPLOY_ENABLED` | `true` |
| Secret | `DEPLOY_HOST` | `uthmaniy.co.com` |
| Secret | `DEPLOY_USER` | your SSH user (e.g. `ubuntu`) |
| Secret | `DEPLOY_SSH_KEY` | private key authorised for that user |
| Secret | `DEPLOY_PATH` | `/opt/matchvision` |

If the GHCR package is private, log the server into the registry once:

```bash
echo "<PAT with read:packages>" | docker login ghcr.io -u <github-username> --password-stdin
```

## 6. Operations

```bash
cd /opt/matchvision/deploy
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f caddy
```

**Backups** (SQLite lives in the `matchvision-data` volume):

```bash
docker compose -f docker-compose.prod.yml exec -T web \
  node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('/data/matchvision.db').exec(\"VACUUM INTO '/data/backup.db'\")"
docker compose -f docker-compose.prod.yml cp web:/data/backup.db ./matchvision-backup-$(date +%F).db
```

Restore by stopping the stack, replacing `/data/matchvision.db` in the volume, and starting again.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Caddy cannot get a certificate | DNS not propagated, port 80 blocked | Check `dig +short uthmaniy.co.com`, open port 80, retry `deploy.sh` |
| Login appears to succeed then redirects to login | `COOKIE_SECURE`/`TRUST_PROXY` mismatch | Keep both `true` behind Caddy (defaults in the prod compose) |
| `502` from Caddy | App container unhealthy | `docker compose logs web`; confirm `/api/health` on 127.0.0.1:3000 |
| Port 3000 exposed publicly | Override removed the loopback bind | Re-publish as `127.0.0.1:3000:3000`, never `3000:3000` |

## 8. Security notes

- The app container is never published beyond loopback; only Caddy is internet-facing.
- TLS/HSTS is enforced at the edge; the app also sends its own security headers and CSP.
- `.env` is `0600`; secrets are not committed. Code explorer/test runner is disabled in production.
- Rate limiting and sessions are per-container; for multiple replicas move sessions/limits to Redis and the database to Postgres.
