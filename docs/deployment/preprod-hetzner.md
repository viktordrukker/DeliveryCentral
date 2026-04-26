# Pre-Prod on Hetzner — Runbook

Single-tenant demo environment. CI builds images in GHCR; `deploy.yml` SSHes
into a Hetzner VPS and runs `docker compose -f docker-compose.prod.yml pull`
→ `up -d`. Monitoring and GitHub-issue auto-filing are opt-in via the
`monitoring` compose profile.

Files referenced below live in the repo root unless noted:
[docker-compose.prod.yml](../../docker-compose.prod.yml),
[Caddyfile](../../Caddyfile),
[.env.preprod.example](../../.env.preprod.example),
[ops/issue-reporter/report.sh](../../ops/issue-reporter/report.sh),
[.github/workflows/deploy.yml](../../.github/workflows/deploy.yml).

---

## 1. Sizing

| | Recommended |
|---|---|
| Hetzner VPS | CX32 (4 vCPU shared AMD, 8 GB RAM, 80 GB SSD, ~€7.55/mo) |
| Location | Fsn1 / Nbg1 / Hel1 (pick closest to testers) |
| OS image | Ubuntu 24.04 LTS |
| Backups | Enable in Hetzner console (+20%, ~€1.50/mo) |
| Firewall | Hetzner Cloud Firewall: 22/tcp (your IP only), 80/tcp, 443/tcp, 443/udp |
| DNS | A records: `preprod.<domain>`, `monitor.preprod.<domain>`, `logs.preprod.<domain>` → VPS IP |

Budget per container (matches compose `mem_limit`s in [docker-compose.yml](../../docker-compose.yml)):
postgres ≈ 512 MB · backend ≈ 2 GB · frontend ≈ 1 GB · caddy + uptime-kuma +
dozzle + issue-reporter ≈ 500 MB · OS + buffers ≈ 1 GB. Leaves ~3 GB headroom
on CX32.

## 2. Server bootstrap (one-time)

```bash
# --- as root, first SSH ---
apt-get update && apt-get -y upgrade
apt-get install -y ca-certificates curl ufw unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades

# Deploy user
adduser --disabled-password --gecos '' deploy
usermod -aG sudo,docker deploy     # docker group created below
mkdir -p /home/deploy/.ssh
# Paste the GitHub Actions public key:
cat > /home/deploy/.ssh/authorized_keys <<'KEY'
ssh-ed25519 AAAA... deploy@github-actions
KEY
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

# Harden sshd
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# Docker CE
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

# Cap per-container logs (prevents a chatty demo from filling /)
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "10" }
}
JSON
systemctl restart docker

# UFW (Hetzner Cloud Firewall is the primary gate; UFW is belt-and-braces)
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
ufw --force enable
```

## 3. Lay down the stack

```bash
# --- as deploy user ---
sudo mkdir -p /opt/deliverycentral-staging
sudo chown deploy:deploy /opt/deliverycentral-staging
cd /opt/deliverycentral-staging

# Pull the two files we need from the repo at main (replace <owner>/<repo>):
curl -fsSL -o docker-compose.prod.yml \
  https://raw.githubusercontent.com/<owner>/<repo>/main/docker-compose.prod.yml
curl -fsSL -o Caddyfile \
  https://raw.githubusercontent.com/<owner>/<repo>/main/Caddyfile

# Issue-reporter source — needed for the monitoring profile's build step.
mkdir -p ops/issue-reporter
for f in Dockerfile report.sh; do
  curl -fsSL -o ops/issue-reporter/$f \
    https://raw.githubusercontent.com/<owner>/<repo>/main/ops/issue-reporter/$f
done
chmod +x ops/issue-reporter/report.sh

# .env — copy the template and fill it in
curl -fsSL -o .env \
  https://raw.githubusercontent.com/<owner>/<repo>/main/.env.preprod.example
chmod 600 .env
${EDITOR:-nano} .env
```

Fill in every `change-me-*` value in `.env`. Generate secrets with:

```bash
openssl rand -hex 32                                     # POSTGRES_PASSWORD
openssl rand -hex 48                                     # AUTH_JWT_SECRET
# Caddy basic-auth hash for Uptime Kuma + Dozzle:
docker run --rm caddy:2.9-alpine caddy hash-password --plaintext 'your-demo-password'
```

## 4. Log in to GHCR (one-time, stored in ~/.docker/config.json)

```bash
# Create a classic PAT with read:packages scope, then:
echo '<PAT>' | docker login ghcr.io -u <github-username> --password-stdin
```

## 5. First boot

```bash
cd /opt/deliverycentral-staging
export BACKEND_IMAGE=ghcr.io/<owner>/deliverycentral-backend:latest
export FRONTEND_IMAGE=ghcr.io/<owner>/deliverycentral-frontend:latest
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d migrate
docker compose -f docker-compose.prod.yml wait migrate
docker compose -f docker-compose.prod.yml up -d backend frontend caddy

# Verify
curl -sf https://preprod.<domain>/api/health
curl -sf https://preprod.<domain>/api/health/deep | jq .status   # expect "ready"
```

## 6. Seed the demo data (one-time)

`db:seed` relies on `ts-node`, which is a devDependency and is stripped from
the production image. For the one-time demo seed the simplest path is to run
a throwaway container that retains dev deps:

```bash
cd /opt/deliverycentral-staging
docker compose -f docker-compose.prod.yml exec backend sh -c '
  cd /app && \
  npm install --no-save --no-audit ts-node@10 typescript@5 >/dev/null && \
  SEED_PROFILE=phase2 node_modules/.bin/ts-node \
    --transpile-only --project tsconfig.json prisma/seed.ts
'
```

After seeding, log in at `https://preprod.<domain>` with `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` and rotate the password immediately.

## 7. Turn on monitoring + issue auto-filer

```bash
cd /opt/deliverycentral-staging
docker compose -f docker-compose.prod.yml --profile monitoring up -d --build
```

That starts:
- **Uptime Kuma** at `https://monitor.preprod.<domain>` — configure two HTTP
  monitors (one-time via its UI):
  - `GET https://preprod.<domain>/api/health` — 30s interval, expect HTTP 200
  - `GET https://preprod.<domain>/api/health/deep` — 60s interval, keyword
    match `"status":"ready"`
- **Dozzle** at `https://logs.preprod.<domain>` — live container logs, behind
  the same basic-auth block in [Caddyfile](../../Caddyfile).
- **issue-reporter** — a sidecar that watches `docker events` on the host. On
  a container `die` with non-zero exit, or `health_status: unhealthy`, it
  computes an error signature from the last log lines and either opens a new
  issue or comments on an existing open issue with the same signature.

## 8. Wire GitHub Actions to deploy here

In GitHub → repo → Settings:

- **Variables**:
  - `STAGING_DEPLOY_ENABLED=true`
  - `PRODUCTION_DEPLOY_ENABLED` — leave unset (keeps the prod job skipped)
- **Secrets**:
  - `STAGING_VPS_HOST` — VPS public IP
  - `STAGING_VPS_USER` — `deploy`
  - `STAGING_VPS_SSH_KEY` — the private key paired with the public key you
    pasted into `/home/deploy/.ssh/authorized_keys`
  - `STAGING_CADDY_DOMAIN` — `preprod.<domain>`

The existing `deploy-staging` job in [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml)
now doubles as the pre-prod deploy. Every push to `main` rebuilds the backend
and frontend images, pushes them to GHCR, SSHes in, pulls, runs migrate, and
brings up backend / frontend / caddy with a `/api/health` + `/api/health/deep`
smoke gate.

## 9. Logs and day-to-day ops

| Task | Command |
|---|---|
| Live logs (all services) | `docker compose -f docker-compose.prod.yml logs -f` |
| Live logs (backend only) | `docker compose -f docker-compose.prod.yml logs -f backend` |
| Live logs via browser | `https://logs.preprod.<domain>` (Dozzle) |
| Restart one service | `docker compose -f docker-compose.prod.yml restart backend` |
| Pull + redeploy manually | `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d --no-build backend frontend caddy` |
| Check container health | `docker compose -f docker-compose.prod.yml ps` |
| Rotate Postgres password | Edit `.env`, `docker compose restart postgres backend migrate` |
| Uptime dashboard | `https://monitor.preprod.<domain>` |
| Shut everything down | `docker compose -f docker-compose.prod.yml --profile monitoring down` |

Logs are capped at `20m × 10 files` per container (step 2). For longer
retention, ship stdout into an external sink — the `monitoring-agent` Vector
service in [docker-compose.yml](../../docker-compose.yml) is already scaffolded
and can be promoted into prod compose when needed.

## 10. What to do when the issue-reporter opens an issue

1. Open the issue — it includes the container name, event (`die` /
   `health_status`), exit code, deployed commit SHA, and the last 200 log
   lines.
2. Check live state: `docker compose ps` on the VPS; if the container has
   restarted on its own (`restart: unless-stopped`), health may already be
   green.
3. Look at Dozzle for current logs and recent patterns.
4. Patch locally, push to `main` — the normal deploy picks up the fix. On the
   next healthy boot, the open issue can be closed manually (the reporter
   does not auto-resolve; by design).

## 11. Promoting to real production later

When you stand up a separate prod box:

1. Provision a second VPS, run steps 2–5 with a different `CADDY_DOMAIN`.
2. Set repo variable `PRODUCTION_DEPLOY_ENABLED=true` plus the `VPS_HOST`,
   `VPS_USER`, `VPS_SSH_KEY`, `CADDY_DOMAIN` secrets.
3. The existing `deploy-production` job in
   [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) picks up
   the next push, gated by the staging-freshness rule already wired in.
