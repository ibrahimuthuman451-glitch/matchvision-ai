# MatchVision AI — Commercial Football Intelligence Platform

MatchVision AI is a **web platform** (not a mobile app) for turning football broadcast or tactical
video into pitch-calibrated tracking, event detection and coaching-grade reporting. It has two
parts that deploy independently:

| Layer | Stack | Responsibility |
| --- | --- | --- |
| **Web product** | React 19 + Vite 8 + Tailwind 4, Express 4, `node:sqlite` | Marketing site, accounts, workspaces, match library, reports, broadcast studio |
| **CV engine** | Python 3.10+, OpenCV, Ultralytics YOLO, NumPy/SciPy | Detection, tracking, calibration, event detection, analytics, replay timeline, MP4 overlays |

The web tier never stores video. The engine runs on your hardware and exports a versioned JSON
artefact; staff upload that artefact to the workspace and work from the reports.

---

## Product surfaces

- **Public site** — landing page, pricing, security overview, privacy and terms (`/`, `/pricing`, `/security`, `/privacy`, `/terms`).
- **Accounts** — email/password signup, scrypt hashing, server-side sessions, HttpOnly cookies, first user of a workspace becomes its administrator.
- **Match library** — drag-and-drop upload of `matchvision.match.v1` artefacts, per-workspace visibility, JSON export, delete.
- **Match report** — real metrics from the artefact: players tracked, distance, top speed, event mix, team shape (defensive line, compactness, width, length, possession) and the latest events.
- **Studio replay** — open any artefact in the tactical studio (`/app/studio/:matchId`). The pitch is rebuilt from `~4 Hz` tracked timelines with a real scrubber, play/pause and speed controls; switch back to the bundled demo dataset at any time. Events and per-player distance/sprint totals come from the artefact.
- **Studio** (`/app`) — broadcast, coach, player, fan and admin dashboards. It runs on a bundled **demo dataset** and is labelled as such in the UI.
- **Admin tools** — code explorer and Python test runner, restricted to workspace admins and disabled with `ENABLE_CODE_EXPLORER=false`.

## Quick start (local)

```bash
# 1. web tier
npm ci
cp .env.example .env
npm run dev            # http://localhost:3000

# 2. production build
npm run build && NODE_ENV=production npm start
```

Create an account at `/signup`. The SQLite database is created automatically at `DATABASE_PATH`
(`./data/matchvision.db` by default).

## Produce a match artefact

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python main.py --mode test                                      # 5 engine suites
python main.py --mode demo --export-json demo_match.json        # synthetic match, no weights needed
python main.py --mode process --video match.mp4 --output tracked.mp4 --export-json match.json
```

Then open **Match library → Upload match artefact** and select `demo_match.json`, and use **Studio** to replay it on the tactical board.
A pre-generated artefact is included at `samples/demo_match.json` if you want to try the
workspace before installing the Python engine.

### Artefact contract (`matchvision.match.v1`)

```jsonc
{
  "schema": "matchvision.match.v1",
  "generated_at": "2026-11-17T10:00:00+00:00",
  "video": { "frames": 150, "fps": 30, "calibration": "Calibrated" },
  "team_metrics": [{ "team_id": 0, "defensive_line_height_m": 31.7, "compactness_m2": 643.5, "possession_pct": 48.2 }],
  "players": [{ "track_id": 1, "team_id": 0, "distance_m": 1024.3, "max_speed_kmh": 31.4, "sprints": 7 }],
  "events": [{ "event_type": "pass_complete", "frame_idx": 120, "team_id": 0, "player_id": 4 }],
  // Sparse replay timeline (default 4 Hz, capped at 1500 samples)
  "timeline": [{ "t": 4.0, "b": [3.2, 18.2], "p": { "1": [-28.1, 7.8], "2": [-15.5, -8.1] } }],
  "timeline_hz": 4.0,
  "summary": { "players_tracked": 20, "events_detected": 3 }
}
```

Uploads are validated server-side (schema, array bounds, 10 MB body limit) and scoped to the
uploader's organisation.

---

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | `production` enables static hosting, CSP, HSTS |
| `DATABASE_PATH` | `./data/matchvision.db` | SQLite file location |
| `COOKIE_SECURE` | `false` | Set `true` behind HTTPS |
| `TRUST_PROXY` | `false` | Set `true` behind a reverse proxy |
| `APP_URL` | `http://localhost:3000` | Public URL |
| `MAX_BODY_SIZE` | `10mb` | Max artefact upload size |
| `ENABLE_CODE_EXPLORER` | `true` | Admin code/test tooling |
| `GEMINI_API_KEY` | empty | Optional generative analysis |
| `GEMINI_*_MODEL` | `gemini-2.5-*` | Model overrides |

Without a Gemini key every AI endpoint returns a deterministic offline summary built from the
submitted match context — the product never fabricates player names or scores.

---

## Deployment

### Production on uthmaniy.co.com (Docker + Caddy)

```bash
git clone https://github.com/ibrahimuthuman451-glitch/matchvision-ai.git /opt/matchvision
cd /opt/matchvision/deploy
cp .env.example .env && chmod 600 .env
./deploy.sh
```

`deploy/docker-compose.prod.yml` runs the app on loopback only and fronts it with Caddy,
which obtains and renews Let's Encrypt certificates for `uthmaniy.co.com` and redirects
`www`. Cookies are Secure and the proxy is trusted in this profile. Full runbook, backups,
firewall/DNS checklist and troubleshooting: [`deploy/README.md`](deploy/README.md).

### Local / self-hosted Docker

```bash
docker compose up -d --build
# app: http://localhost:3000
# data: matchvision-data volume → /data/matchvision.db
```

Terminate TLS at your ingress (nginx, Caddy, Cloudflare, an ALB) and set:

```
COOKIE_SECURE=true
TRUST_PROXY=true
APP_URL=https://analysis.yourclub.com
```

### Manual (Node 24+)

```bash
npm ci && npm run build
NODE_ENV=production DATABASE_PATH=/var/lib/matchvision/matchvision.db node server.ts
```

The process exposes `/api/health`, handles `SIGTERM`/`SIGINT` with graceful shutdown and runs the
SQLite schema migration on boot.

### Backups

Back up the SQLite file (or the volume) on a schedule; WAL mode is enabled. `sqlite3 file.db
'.backup backup.db'` is safe while the service is running.

### Scaling notes

Rate limiting and sessions are stored per node. For horizontal scaling, move sessions and the rate
limiter to Redis and replace SQLite with a managed Postgres instance; the data access layer is
isolated in `server/db.ts`.

---

## API

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | public | Liveness probe |
| `POST` | `/api/auth/signup` | public | Create workspace + admin user |
| `POST` | `/api/auth/login` | public | Start session |
| `POST` | `/api/auth/logout` | session | End session |
| `GET` | `/api/auth/me` | optional | Session user + plan usage |
| `PATCH` | `/api/auth/me` | session | Rename account |
| `GET` | `/api/auth/plans` | public | Plan catalogue |
| `GET` | `/api/matches` | session | List workspace matches |
| `POST` | `/api/matches` | session | Upload artefact |
| `GET` | `/api/matches/:id` | session | Match + payload |
| `GET` | `/api/matches/:id/export` | session | Download artefact |
| `DELETE` | `/api/matches/:id` | owner/admin | Delete match |
| `GET` | `/api/ai/status` | public | AI configuration |
| `POST` | `/api/ai/tactical-query` | session | Tactical analysis |
| `POST` | `/api/ai/broadcast-chat` | session | Broadcast copy |
| `GET` | `/api/dev/python-modules` | admin | Engine source browser |
| `POST` | `/api/dev/run-tests` | admin | Run engine suites |

Auth errors return `{ "error": "authentication_required", "message": "..." }`.

---

## Security model

- scrypt password hashing with per-user salts; minimum 10 characters, letters and numbers.
- 256-bit random session tokens stored server-side, delivered as `HttpOnly; SameSite=Lax` cookies with seven-day sliding expiry.
- State-changing requests are origin-checked; JSON bodies are size-limited; auth endpoints are rate limited (20 attempts / 15 min / IP).
- Every match query is scoped to the session's organisation; deletes require ownership or workspace admin.
- Security headers on every response; production adds CSP and HSTS.
- Audit log for signup, login, logout, match create/delete and account changes.
- No video upload; artefacts contain tracking IDs, not biometric templates.

See `/security` in the running product for the customer-facing version.

---

## Verification and CI/CD

```bash
npx tsc --noEmit          # type safety
npm run build             # production client bundle
python main.py --mode test
python main.py --mode demo --export-json demo_match.json
curl -s localhost:3000/api/health
```

`.github/workflows/publish.yml` runs the same checks on every push to `main`, builds and
publishes `ghcr.io/ibrahimuthuman451-glitch/matchvision-ai` (latest + commit SHA), and can
deploy over SSH when the `DEPLOY_*` secrets and `DEPLOY_ENABLED` variable are configured
(see the deploy runbook).

## Known limitations

1. **Replay uses sampled timelines.** Artefacts exported by the current engine include ~4 Hz tracked positions, which the studio interpolates. Artefacts exported before this change still load, but show the final tracked snapshot with playback disabled. The coach/player/fan dashboards reuse the same tracked players, while their directives, polls and scouting panels remain demo fixtures.
2. The CV engine uses COCO YOLO weights unless you supply a football-tuned model; goalkeeper/referee classification is heuristic.
3. xG, xT and PPDA in the engine are baseline models, and field tilt/PPDA report `0` until a completed event feed is available. Possession is computed from tracked ball ownership frames.
4. Single-node SQLite deployment; horizontal scaling needs Postgres + Redis (see scaling notes).
5. Plan limits are enforced in the API, but billing is not integrated — connect a payment provider before charging customers.

---

© MatchVision Labs Ltd. Proprietary software — all rights reserved.
