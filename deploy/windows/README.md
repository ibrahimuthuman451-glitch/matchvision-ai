# Deploying from Windows to uthmaniy.co.com

## Why the earlier attempt failed

The commands in the screenshot are Linux server commands and were typed into **Windows CMD**:

| Error | Cause |
| --- | --- |
| `The system cannot find the file specified` after `ssh <user>@...` | `<user>` is a placeholder; `<` and `>` are input redirection in CMD. |
| `'sudo'/'cp'/'.' is not recognized` | Those are Linux commands; CMD has no `sudo`, and `./script.sh` is not how Windows runs files. |
| `Repository not found` | The GitHub repo is **private**; an anonymous `git clone` is rejected. |
| `cd /opt/matchvision` | `/opt` is a Linux path; Windows uses `C:\...`. |

You do not run the deployment on your laptop's CMD. You either:

- **A.** run this one PowerShell script, which packages the app and deploys it to the server over SSH (recommended), or
- **B.** SSH into the server and run the Linux commands there.

## 0. Get the project onto your PC first

The script lives *inside* the repository, so running it from `C:\Users\PC` fails with
"The system cannot find the file specified". Download the code first:

1. Open <https://github.com/ibrahimuthuman451-glitch/matchvision-ai> in your browser
   (you are the owner, so the private repo is visible while signed in).
2. Green **Code** button → **Download ZIP**.
3. Right-click the downloaded ZIP → **Extract All…** → e.g. `C:\Users\PC\matchvision-ai-main`.
4. Open that folder. Hold **Shift**, right-click an empty area → **Open PowerShell window here**.
   (Or open PowerShell and run `cd "C:\Users\PC\matchvision-ai-main"`.)
5. Confirm the script is there:

```powershell
dir .\deploy\windows
```

Use **PowerShell**, not CMD. Lines starting with `#` in the docs are comments — do not type them
as commands.

## A. One-command deploy from Windows

### What you need

1. Windows 10/11 with **OpenSSH Client** (`ssh`, `scp`) and `tar` — both ship with Windows
   (`tar` since Windows 10 1803). Check in PowerShell: `ssh -V`, `tar --version`.
2. **SSH access to the server** behind `uthmaniy.co.com`: username (e.g. `root`, `ubuntu`, or
   your cPanel/IBM Cloud user) plus a password or private key. If you do not have this,
   retrieve it from the IBM Cloud console (VSI → Access) or your hosting panel — the deploy
   cannot proceed without it.
3. **Docker Engine + Compose v2 on the server**. The script checks this and stops with the
   install command if it is missing.

### Run it

Open **PowerShell** in the repository folder (the folder containing `package.json`):

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows\deploy-from-windows.ps1 -SshUser root
```

With a private key and a non-root user:

```powershell
.\deploy\windows\deploy-from-windows.ps1 -SshUser ubuntu -KeyPath C:\Users\PC\.ssh\id_ed25519
```

Optional parameters: `-SshHost` (default `uthmaniy.co.com`), `-InstallPath` (default
`/opt/matchvision`), `-Archive` (reuse a previously built `.tar.gz`).

The script prints 4 steps: SSH check → Docker check → package (~350 KB, no `node_modules`,
no `.git`, no videos, **no GitHub login needed on the server**) → upload + bootstrap + deploy.

### Verify

```powershell
curl.exe -s https://uthmaniy.co.com/api/health
# {"status":"ok","service":"matchvision-web","uptime":...}
```

Then open <https://uthmaniy.co.com> and create the workspace account.

## B. If you prefer to run commands on the server

From PowerShell, connect first:

```powershell
ssh root@uthmaniy.co.com
```

Then, **on the server**, run the Linux commands from `deploy/README.md`. Because the repo is
private, clone with authentication (a PAT or an SSH deploy key) or upload the archive produced
by the Windows script and run `deploy/server-bootstrap.sh`.

## No server access?

If you cannot obtain SSH credentials, the domain's host is not usable from here. Two options:

1. Ask the hosting provider/IBM Cloud account owner for console + SSH access.
2. Deploy the same Docker image to a platform you control (Railway, Render, Fly.io, a VPS)
   and point `uthmaniy.co.com`'s A record at it. The image and compose stack are ready.

## Just want to see it on Windows first (no server)

```powershell
# Node 24+, then from the repo folder
npm ci
npm run dev      # http://localhost:3000
```

No Docker required for local development. Upload `samples/demo_match.json` in the match
library to try the report and studio replay.
