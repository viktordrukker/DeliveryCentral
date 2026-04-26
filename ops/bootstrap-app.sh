#!/usr/bin/env bash
# bootstrap-app.sh — Phase 6 of the Hetzner deployment plan.
#
# Run as the `deploy` user, from /opt/deliverycentral, AFTER:
#   1. ops/bootstrap-vm.sh has finished
#   2. DNS A records for app/staging/monitor/logs subdomains resolve
#   3. GHA images have been built (push to main → ghcr.io/<you>/...:latest exists)
#   4. You have a GHCR Personal Access Token (read:packages)
#
# Usage:
#   cd /opt/deliverycentral
#   git clone https://github.com/<you>/DeliveryCentral.git .
#   bash ops/bootstrap-app.sh
#
# What it does (idempotent — safe to re-run):
#   - Prompts for: domain, GHCR creds, admin email
#   - Generates per-env .env files with random secrets
#   - Renders the data-stack compose + Caddyfile from templates
#   - Brings up the data stack (postgres + caddy)
#   - Pulls latest GHCR images
#   - Brings up prod + staging app stacks
#   - Installs the daily backup cron
#   - Verifies health endpoints, prints summary

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATES="$REPO_ROOT/ops/templates"
DATA_DIR=/opt/deliverycentral-data
PROD_DIR=/opt/deliverycentral
STAGING_DIR=/opt/deliverycentral-staging

C_BOLD='\033[1m'; C_GRN='\033[0;32m'; C_YEL='\033[0;33m'; C_RED='\033[0;31m'; C_OFF='\033[0m'
step() { printf "\n${C_BOLD}==> %s${C_OFF}\n" "$*"; }
ok()   { printf "    ${C_GRN}✓ %s${C_OFF}\n" "$*"; }
warn() { printf "    ${C_YEL}! %s${C_OFF}\n" "$*"; }
die()  { printf "    ${C_RED}✗ %s${C_OFF}\n" "$*" >&2; exit 1; }

[ "$(id -un)" = "deploy" ] || die "must run as the 'deploy' user (try: sudo -u deploy bash $0)"
[ -d "$TEMPLATES" ] || die "templates directory not found at $TEMPLATES — clone the repo into $REPO_ROOT first"
groups | grep -q '\bdocker\b' || die "deploy user is not in the docker group — log out and back in, then re-run"

# -----------------------------------------------------------------------------
gen_secret() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 48; }

# -----------------------------------------------------------------------------
step "1/9  Collect inputs"

# Re-load previous answers if this is a re-run.
ANS_FILE=/opt/deliverycentral-data/.bootstrap-answers
if [ -f "$ANS_FILE" ]; then
    # shellcheck source=/dev/null
    source "$ANS_FILE"
    ok "loaded previous answers from $ANS_FILE"
fi

prompt() {
    local var="$1" question="$2" default="${3:-}"
    local current="${!var:-}"
    if [ -n "$current" ]; then
        read -rp "$question [$current]: " input
        eval "$var=\"\${input:-$current}\""
    elif [ -n "$default" ]; then
        read -rp "$question [$default]: " input
        eval "$var=\"\${input:-$default}\""
    else
        read -rp "$question: " input
        [ -n "$input" ] || die "required"
        eval "$var=\"$input\""
    fi
}

prompt PROD_DOMAIN     "Production domain (e.g. app.example.com)"
prompt STAGING_DOMAIN  "Staging domain (e.g. staging.example.com)"
prompt MONITOR_DOMAIN  "Monitoring domain (e.g. monitor.example.com)"
prompt LOGS_DOMAIN     "Logs domain (e.g. logs.example.com)"
prompt ADMIN_EMAIL     "Initial admin email" "admin@deliverycentral.local"
prompt ADMIN_NAME      "Initial admin display name" "System Administrator"
prompt GHCR_OWNER      "GHCR owner (your GitHub username/org)"
prompt GHCR_USER       "GHCR username (usually same as owner)" "$GHCR_OWNER"

if [ -z "${GHCR_PAT:-}" ]; then
    read -rsp "GHCR PAT (input hidden, scope=read:packages): " GHCR_PAT
    echo
    [ -n "$GHCR_PAT" ] || die "GHCR PAT required"
fi

# Persist non-secret answers for re-runs.
sudo install -o deploy -g deploy -m 600 /dev/null "$ANS_FILE" 2>/dev/null || true
cat > "$ANS_FILE" <<EOF
PROD_DOMAIN=$PROD_DOMAIN
STAGING_DOMAIN=$STAGING_DOMAIN
MONITOR_DOMAIN=$MONITOR_DOMAIN
LOGS_DOMAIN=$LOGS_DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_NAME=$ADMIN_NAME
GHCR_OWNER=$GHCR_OWNER
GHCR_USER=$GHCR_USER
EOF
chmod 600 "$ANS_FILE"
ok "answers saved to $ANS_FILE"

# -----------------------------------------------------------------------------
step "2/9  Generate / preserve secrets"

ENV_DATA="$DATA_DIR/.env"
ENV_PROD="$PROD_DIR/.env"
ENV_STAGING="$STAGING_DIR/.env"

read_or_gen() {
    local file="$1" key="$2"
    if [ -f "$file" ] && grep -q "^${key}=" "$file"; then
        grep "^${key}=" "$file" | head -1 | cut -d= -f2-
    else
        gen_secret
    fi
}

POSTGRES_SUPERUSER_PASSWORD="$(read_or_gen "$ENV_DATA" POSTGRES_SUPERUSER_PASSWORD)"
PROD_DB_PASSWORD="$(read_or_gen "$ENV_DATA" PROD_DB_PASSWORD)"
STAGING_DB_PASSWORD="$(read_or_gen "$ENV_DATA" STAGING_DB_PASSWORD)"
PROD_AUTH_JWT="$(read_or_gen "$ENV_PROD" AUTH_JWT_SECRET)"
STAGING_AUTH_JWT="$(read_or_gen "$ENV_STAGING" AUTH_JWT_SECRET)"
PROD_ADMIN_PW="$(read_or_gen "$ENV_PROD" SEED_ADMIN_PASSWORD)"
STAGING_ADMIN_PW="$(read_or_gen "$ENV_STAGING" SEED_ADMIN_PASSWORD)"

ok "secrets ready (preserved on re-run if files exist)"

# -----------------------------------------------------------------------------
step "3/9  Render data-stack files into $DATA_DIR"

mkdir -p "$DATA_DIR/caddy"
cp "$TEMPLATES/caddy/Dockerfile"       "$DATA_DIR/caddy/Dockerfile"
cp "$TEMPLATES/data-stack.compose.yml" "$DATA_DIR/docker-compose.yml"
cp "$TEMPLATES/data-stack.Caddyfile"   "$DATA_DIR/Caddyfile"
cp "$TEMPLATES/init-db.sh"             "$DATA_DIR/init-db.sh"
chmod +x "$DATA_DIR/init-db.sh"

cat > "$ENV_DATA" <<EOF
POSTGRES_SUPERUSER_PASSWORD=$POSTGRES_SUPERUSER_PASSWORD
PROD_DB_PASSWORD=$PROD_DB_PASSWORD
STAGING_DB_PASSWORD=$STAGING_DB_PASSWORD
PROD_DOMAIN=$PROD_DOMAIN
STAGING_DOMAIN=$STAGING_DOMAIN
MONITOR_DOMAIN=$MONITOR_DOMAIN
LOGS_DOMAIN=$LOGS_DOMAIN
CADDY_BASIC_AUTH_USER=admin
CADDY_BASIC_AUTH_HASH=
EOF
chmod 600 "$ENV_DATA"
ok "wrote $ENV_DATA + Caddyfile + docker-compose.yml + init-db.sh"

# -----------------------------------------------------------------------------
step "4/9  Render per-stack .env files"

render_env() {
    local template="$1" out="$2" jwt="$3" admin_pw="$4" db_pw="$5" domain="$6"
    sed \
        -e "s|__GHCR_OWNER__|$GHCR_OWNER|g" \
        -e "s|__PROD_DOMAIN__|$PROD_DOMAIN|g" \
        -e "s|__STAGING_DOMAIN__|$STAGING_DOMAIN|g" \
        -e "s|__PROD_DB_PASSWORD__|$PROD_DB_PASSWORD|g" \
        -e "s|__STAGING_DB_PASSWORD__|$STAGING_DB_PASSWORD|g" \
        -e "s|__ADMIN_EMAIL__|$ADMIN_EMAIL|g" \
        -e "s|__ADMIN_DISPLAY_NAME__|$ADMIN_NAME|g" \
        "$template" > "$out"
    # __GENERATED__ markers are env-specific. Replace just the AUTH_JWT and
    # SEED_ADMIN_PASSWORD ones (in that order — only two left after sed above).
    awk -v jwt="$jwt" -v pw="$admin_pw" '
        BEGIN { count = 0 }
        /__GENERATED__/ {
            count++
            if (count == 1) { sub(/__GENERATED__/, jwt) }
            else if (count == 2) { sub(/__GENERATED__/, pw) }
        }
        { print }
    ' "$out" > "$out.tmp" && mv "$out.tmp" "$out"
    chmod 600 "$out"
}

render_env "$TEMPLATES/env.prod.example"    "$ENV_PROD"    "$PROD_AUTH_JWT"    "$PROD_ADMIN_PW"    "$PROD_DB_PASSWORD"    "$PROD_DOMAIN"
render_env "$TEMPLATES/env.staging.example" "$ENV_STAGING" "$STAGING_AUTH_JWT" "$STAGING_ADMIN_PW" "$STAGING_DB_PASSWORD" "$STAGING_DOMAIN"
ok "wrote $ENV_PROD + $ENV_STAGING (chmod 600)"

# Mirror the repo into the staging directory so it has the same compose file.
if [ ! -d "$STAGING_DIR/.git" ]; then
    git clone "$REPO_ROOT" "$STAGING_DIR" >/dev/null 2>&1 || warn "could not clone repo into $STAGING_DIR — copying instead"
    [ -d "$STAGING_DIR/.git" ] || cp -r "$REPO_ROOT/." "$STAGING_DIR/"
    ok "staging working tree ready at $STAGING_DIR"
else
    ok "staging working tree already exists"
fi

# -----------------------------------------------------------------------------
step "5/9  Login to GHCR"
echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
ok "logged in to ghcr.io as $GHCR_USER"

# -----------------------------------------------------------------------------
step "6/9  Bring up the data stack (Postgres + Caddy)"
cd "$DATA_DIR"
docker compose --env-file .env up -d --build
# Wait for Postgres to be healthy.
for i in $(seq 1 30); do
    if docker exec dc-data-postgres-1 pg_isready -U postgres >/dev/null 2>&1; then
        ok "postgres healthy"
        break
    fi
    [ "$i" -eq 30 ] && die "postgres did not become healthy in 60s — check: docker logs dc-data-postgres-1"
    sleep 2
done
ok "data stack up — postgres + caddy running"

# -----------------------------------------------------------------------------
step "7/9  Bring up prod + staging app stacks"

deploy_stack() {
    local dir="$1" project="$2" env_file="$3"
    cd "$dir"
    set -a; source "$env_file"; set +a
    docker pull "$BACKEND_IMAGE"
    docker pull "$FRONTEND_IMAGE"
    docker compose -p "$project" -f docker-compose.prod.yml --env-file "$env_file" up -d migrate
    docker compose -p "$project" -f docker-compose.prod.yml --env-file "$env_file" wait migrate \
        || die "migration failed in $project — check: docker compose -p $project logs migrate"
    docker compose -p "$project" -f docker-compose.prod.yml --env-file "$env_file" up -d backend frontend
    ok "$project stack up"
}

deploy_stack "$PROD_DIR"    dc-prod    "$ENV_PROD"
deploy_stack "$STAGING_DIR" dc-staging "$ENV_STAGING"

# Restart Caddy so it (re)resolves the now-existing upstream containers.
docker restart dc-data-caddy-1 >/dev/null
ok "caddy restarted to discover upstreams"

# -----------------------------------------------------------------------------
step "8/9  Install daily backup cron"
cp "$REPO_ROOT/ops/backup.sh" /opt/backups/backup.sh
chmod +x /opt/backups/backup.sh
( crontab -l 2>/dev/null | grep -v 'deliverycentral-backup'; \
  echo '0 3 * * * /opt/backups/backup.sh >> /var/log/dc-backup.log 2>&1 # deliverycentral-backup' \
) | crontab -
sudo touch /var/log/dc-backup.log
sudo chown deploy:deploy /var/log/dc-backup.log
ok "daily backup cron installed (03:00 UTC) → /var/log/dc-backup.log"

# -----------------------------------------------------------------------------
step "9/9  Health verification"
sleep 30
verify() {
    local url="$1" expect="$2"
    if curl -sf "$url" | grep -q "$expect"; then ok "$url OK"
    else warn "$url did NOT match $expect (check logs)"; fi
}
verify "https://$PROD_DOMAIN/api/health" '"status":"ok"'
verify "https://$PROD_DOMAIN/api/health/deep" '"status":"ready"'
verify "https://$STAGING_DOMAIN/api/health" '"status":"ok"'
verify "https://$STAGING_DOMAIN/api/health/deep" '"status":"ready"'

# -----------------------------------------------------------------------------
echo
printf "${C_BOLD}========================  DEPLOYMENT SUMMARY  ========================${C_OFF}\n"
echo
echo "  Production:  https://$PROD_DOMAIN"
echo "  Staging:     https://$STAGING_DOMAIN"
echo
echo "  Admin login (PROD):"
echo "    email:    $ADMIN_EMAIL"
echo "    password: $PROD_ADMIN_PW"
echo
echo "  Admin login (STAGING):"
echo "    email:    $ADMIN_EMAIL"
echo "    password: $STAGING_ADMIN_PW"
echo
echo "  Backups: /opt/backups/  (daily at 03:00 UTC, log: /var/log/dc-backup.log)"
echo "  Restore drill: bash ops/restore-from-backup.sh --file /opt/backups/prod-<date>.sql.gz --target-db restore_test"
echo
warn "Save the admin passwords to a password manager NOW. They are not stored anywhere else"
warn "  (the .env files contain them but you should rotate before opening to users)."
echo
printf "${C_GRN}${C_BOLD}First deploy complete.${C_OFF}\n"
