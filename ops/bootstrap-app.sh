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
#   - Generates per-env .env files with random secrets (preserved on re-run)
#   - Auto-generates monitor bcrypt password (preserved on re-run)
#   - Renders data-stack compose + Caddyfile + Postgres init
#   - Brings up the data stack
#   - On fresh DBs: applies baseline schema + marks 92 migrations as applied
#     (workaround for migration history bit-rot — DM-R-11 / repo memory)
#   - Pulls GHCR images, brings up prod + staging app stacks
#   - Installs daily backup cron, verifies health, prints the wizard URL
#
# Data seeding is handled by the in-app setup wizard at https://<domain>/setup
# after the bootstrap completes. The wizard collects admin credentials, picks
# an install profile (Demo / Quick-start preset / Full clean), and runs the
# seed in-process against the running backend. See memory/project-setup-wizard.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATES="$REPO_ROOT/ops/templates"
BASELINE="$REPO_ROOT/prisma/migrations/.baseline-schema.sql"
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
[ -f "$BASELINE" ] || die "baseline schema missing at $BASELINE — repo not fully checked out?"
groups | grep -q '\bdocker\b' || die "deploy user is not in the docker group — log out and back in, then re-run"

# --refresh-caddy: re-render the deployed data-stack Caddyfile from the
# template + reload Caddy without restart. Used when ops/templates/data-stack.Caddyfile
# changes (security headers, upstream ports, rate limits) and you want the
# change applied immediately without going through the deploy workflow.
# Validates the new file inside the Caddy container BEFORE replacing the live
# copy, so a syntactically broken template never takes down the proxy.
if [ "${1:-}" = "--refresh-caddy" ]; then
    step "Refreshing data-stack Caddyfile from template"
    src="$TEMPLATES/data-stack.Caddyfile"
    dst="$DATA_DIR/Caddyfile"
    [ -f "$src" ] || die "template missing at $src"
    [ -f "$dst" ] || die "deployed Caddyfile missing at $dst — run full bootstrap first"
    if diff -q "$src" "$dst" >/dev/null 2>&1; then
        ok "Caddyfile already up to date — nothing to do"
        exit 0
    fi
    docker ps --format '{{.Names}}' | grep -q '^dc-data-caddy-1$' || die "Caddy container 'dc-data-caddy-1' is not running"
    docker cp "$src" dc-data-caddy-1:/tmp/Caddyfile.new
    if docker exec dc-data-caddy-1 caddy validate --config /tmp/Caddyfile.new --adapter caddyfile; then
        cp "$src" "$dst"
        docker exec dc-data-caddy-1 caddy reload --config /etc/caddy/Caddyfile
        docker exec dc-data-caddy-1 rm -f /tmp/Caddyfile.new || true
        ok "Caddy reloaded with new config"
        exit 0
    else
        docker exec dc-data-caddy-1 rm -f /tmp/Caddyfile.new || true
        die "caddy validate failed on new template — deployed Caddyfile left unchanged"
    fi
fi

gen_secret() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 48; }
gen_pw()     { openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24; }
read_or_gen() {
    local file="$1" key="$2" gen_fn="${3:-gen_secret}"
    if [ -f "$file" ] && grep -q "^${key}=" "$file"; then
        # Strip surrounding single-quotes if present (we quote the bcrypt hash).
        grep "^${key}=" "$file" | head -1 | cut -d= -f2- | sed -e "s/^'//;s/'\$//"
    else
        $gen_fn
    fi
}

# -----------------------------------------------------------------------------
step "1/10  Collect inputs"

ANS_FILE=$DATA_DIR/.bootstrap-answers
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

mkdir -p "$DATA_DIR"
# Quote ADMIN_NAME — it can contain spaces and is bash-sourced on re-runs.
cat > "$ANS_FILE" <<EOF
PROD_DOMAIN=$PROD_DOMAIN
STAGING_DOMAIN=$STAGING_DOMAIN
MONITOR_DOMAIN=$MONITOR_DOMAIN
LOGS_DOMAIN=$LOGS_DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_NAME="$ADMIN_NAME"
GHCR_OWNER=$GHCR_OWNER
GHCR_USER=$GHCR_USER
EOF
chmod 600 "$ANS_FILE"
ok "answers saved to $ANS_FILE"

# -----------------------------------------------------------------------------
step "2/10  Generate / preserve secrets + monitor bcrypt"

ENV_DATA=$DATA_DIR/.env
ENV_PROD=$PROD_DIR/.env
ENV_STAGING=$STAGING_DIR/.env

POSTGRES_SUPERUSER_PASSWORD=$(read_or_gen "$ENV_DATA" POSTGRES_SUPERUSER_PASSWORD)
PROD_DB_PASSWORD=$(read_or_gen "$ENV_DATA" PROD_DB_PASSWORD)
STAGING_DB_PASSWORD=$(read_or_gen "$ENV_DATA" STAGING_DB_PASSWORD)
PROD_AUTH_JWT=$(read_or_gen "$ENV_PROD" AUTH_JWT_SECRET)
STAGING_AUTH_JWT=$(read_or_gen "$ENV_STAGING" AUTH_JWT_SECRET)
PROD_ADMIN_PW=$(read_or_gen "$ENV_PROD" SEED_ADMIN_PASSWORD)
STAGING_ADMIN_PW=$(read_or_gen "$ENV_STAGING" SEED_ADMIN_PASSWORD)

# Monitor password: 24 chars random, bcrypted via Caddy itself.
MONITOR_PW=$(read_or_gen "$ENV_DATA" CADDY_BASIC_AUTH_PLAINTEXT gen_pw)
EXISTING_HASH=""
if [ -f "$ENV_DATA" ]; then
    EXISTING_HASH=$(grep '^CADDY_BASIC_AUTH_HASH=' "$ENV_DATA" 2>/dev/null | head -1 | cut -d= -f2-)
    EXISTING_HASH="${EXISTING_HASH#\'}"
    EXISTING_HASH="${EXISTING_HASH%\'}"
fi
if [ -n "$EXISTING_HASH" ]; then
    CADDY_BASIC_AUTH_HASH="$EXISTING_HASH"
    ok "monitor bcrypt hash preserved from existing .env"
else
    CADDY_BASIC_AUTH_HASH=$(docker run --rm caddy:2.9-alpine caddy hash-password --plaintext "$MONITOR_PW")
    ok "generated new monitor bcrypt hash"
fi

ok "secrets ready (preserved on re-run if files exist)"

# -----------------------------------------------------------------------------
step "3/10  Render data-stack files into $DATA_DIR"

mkdir -p "$DATA_DIR/caddy"
cp "$TEMPLATES/caddy/Dockerfile"       "$DATA_DIR/caddy/Dockerfile"
cp "$TEMPLATES/data-stack.compose.yml" "$DATA_DIR/docker-compose.yml"
cp "$TEMPLATES/data-stack.Caddyfile"   "$DATA_DIR/Caddyfile"
cp "$TEMPLATES/init-db.sh"             "$DATA_DIR/init-db.sh"
chmod +x "$DATA_DIR/init-db.sh"

# CADDY_BASIC_AUTH_HASH MUST be quoted — bcrypt hashes contain $2a$ which bash
# treats as variable expansion under `set -u`.
# We also keep the plaintext password in the file so re-runs preserve it.
cat > "$ENV_DATA" <<EOF
POSTGRES_SUPERUSER_PASSWORD=$POSTGRES_SUPERUSER_PASSWORD
PROD_DB_PASSWORD=$PROD_DB_PASSWORD
STAGING_DB_PASSWORD=$STAGING_DB_PASSWORD
PROD_DOMAIN=$PROD_DOMAIN
STAGING_DOMAIN=$STAGING_DOMAIN
MONITOR_DOMAIN=$MONITOR_DOMAIN
LOGS_DOMAIN=$LOGS_DOMAIN
CADDY_BASIC_AUTH_USER=admin
CADDY_BASIC_AUTH_PLAINTEXT='$MONITOR_PW'
CADDY_BASIC_AUTH_HASH='$CADDY_BASIC_AUTH_HASH'
EOF
chmod 600 "$ENV_DATA"
ok "wrote $ENV_DATA + Caddyfile + docker-compose.yml + init-db.sh"

# -----------------------------------------------------------------------------
step "4/10  Render per-stack .env files"

render_env() {
    local template="$1" out="$2" jwt="$3" admin_pw="$4"
    sed \
        -e "s|__GHCR_OWNER__|$GHCR_OWNER|g" \
        -e "s|__PROD_DOMAIN__|$PROD_DOMAIN|g" \
        -e "s|__STAGING_DOMAIN__|$STAGING_DOMAIN|g" \
        -e "s|__PROD_DB_PASSWORD__|$PROD_DB_PASSWORD|g" \
        -e "s|__STAGING_DB_PASSWORD__|$STAGING_DB_PASSWORD|g" \
        -e "s|__ADMIN_EMAIL__|$ADMIN_EMAIL|g" \
        -e "s|__ADMIN_DISPLAY_NAME__|$ADMIN_NAME|g" \
        "$template" > "$out"
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

render_env "$TEMPLATES/env.prod.example"    "$ENV_PROD"    "$PROD_AUTH_JWT"    "$PROD_ADMIN_PW"
render_env "$TEMPLATES/env.staging.example" "$ENV_STAGING" "$STAGING_AUTH_JWT" "$STAGING_ADMIN_PW"
ok "wrote $ENV_PROD + $ENV_STAGING (chmod 600)"

if [ ! -d "$STAGING_DIR/.git" ]; then
    git clone "$REPO_ROOT" "$STAGING_DIR" >/dev/null 2>&1 || warn "could not clone repo into $STAGING_DIR — copying instead"
    [ -d "$STAGING_DIR/.git" ] || cp -r "$REPO_ROOT/." "$STAGING_DIR/"
    ok "staging working tree ready at $STAGING_DIR"
else
    ok "staging working tree already exists"
fi

# -----------------------------------------------------------------------------
step "5/10  Login to GHCR"
echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
ok "logged in to ghcr.io as $GHCR_USER"

# -----------------------------------------------------------------------------
step "6/10  Bring up the data stack (Postgres + Caddy)"
cd "$DATA_DIR"
docker compose --env-file .env up -d --build
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
# DM-R-11 / migration-history-bit-rot workaround:
# `prisma migrate deploy` from scratch fails because some migrations reference
# tables created by later migrations (out-of-order FK + a retroactive edit).
# The repo ships prisma/migrations/.baseline-schema.sql — a pg_dump of the
# v1.3 schema. We apply that to fresh DBs and mark all 92 migrations as
# already applied. Future deploys add only NEW migrations on top.
#
# Idempotent: skips if the DB already has rows in _prisma_migrations.
step "7/10  Initialize fresh DBs with baseline schema (if empty)"

psql_super() {
    docker exec -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" "$@" \
        dc-data-postgres-1 psql -U postgres -v ON_ERROR_STOP=1
}

db_initialized() {
    local db="$1"
    local count
    count=$(docker exec -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" dc-data-postgres-1 \
        psql -U postgres -d "$db" -tAc \
        "SELECT count(*) FROM _prisma_migrations" 2>/dev/null || echo 0)
    [ "${count:-0}" -gt 0 ]
}

apply_baseline() {
    local db="$1" user="$2"
    echo "    -> applying baseline to $db (owner=$user)"
    # Clean slate (idempotent)
    docker exec -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" dc-data-postgres-1 \
        psql -U postgres -d "$db" -v ON_ERROR_STOP=1 \
        -c "DROP SCHEMA IF EXISTS read_models CASCADE" >/dev/null
    docker exec -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" dc-data-postgres-1 \
        psql -U postgres -d "$db" -v ON_ERROR_STOP=1 \
        -c "DROP SCHEMA IF EXISTS public CASCADE" >/dev/null
    docker exec -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" dc-data-postgres-1 \
        psql -U postgres -d "$db" -v ON_ERROR_STOP=1 \
        -c "CREATE SCHEMA public" >/dev/null

    # Apply baseline as superuser (CREATE EXTENSION pg_stat_statements + pg_trgm
    # need superuser; can't be done as the per-env user).
    docker exec -i -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" dc-data-postgres-1 \
        psql -U postgres -d "$db" -v ON_ERROR_STOP=1 < "$BASELINE" \
        > /tmp/baseline-$db.log 2>&1 \
        || { echo "baseline FAILED:"; tail -10 /tmp/baseline-$db.log; return 1; }

    # Reassign + grant so the per-env user can read/write.
    docker exec -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" dc-data-postgres-1 \
        psql -U postgres -d "$db" -c "REASSIGN OWNED BY postgres TO ${user}" >/dev/null 2>&1 || true
    for stmt in \
        "GRANT ALL ON SCHEMA public TO ${user}" \
        "GRANT ALL ON SCHEMA read_models TO ${user}" \
        "GRANT ALL ON ALL TABLES    IN SCHEMA public      TO ${user}" \
        "GRANT ALL ON ALL SEQUENCES IN SCHEMA public      TO ${user}" \
        "GRANT ALL ON ALL FUNCTIONS IN SCHEMA public      TO ${user}" \
        "GRANT ALL ON ALL TABLES    IN SCHEMA read_models TO ${user}" \
        "GRANT ALL ON ALL SEQUENCES IN SCHEMA read_models TO ${user}" \
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public      GRANT ALL ON TABLES    TO ${user}" \
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public      GRANT ALL ON SEQUENCES TO ${user}" \
        "ALTER DEFAULT PRIVILEGES IN SCHEMA read_models GRANT ALL ON TABLES    TO ${user}"; do
        docker exec -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" dc-data-postgres-1 \
            psql -U postgres -d "$db" -v ON_ERROR_STOP=1 -c "$stmt" >/dev/null
    done

    # Schema-vs-code drift workaround: schema.prisma declares Skill.name as
    # @unique (single col) but later migrations replaced it with a composite
    # @@unique([tenantId, name]) — the seed's prisma.skill.upsert({where:{name}})
    # needs the single-col constraint back. Add it idempotently as superuser
    # (DM-R-21 trigger blocks DDL from app users).
    docker exec -e PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD" dc-data-postgres-1 \
        psql -U postgres -d "$db" -c \
        "DO \$\$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='skills_name_key') THEN
                ALTER TABLE skills ADD CONSTRAINT skills_name_key UNIQUE (name);
            END IF;
        END \$\$" >/dev/null
}

mark_migrations_applied() {
    local env_file="$1" label="$2"
    echo "    -> marking 92 migrations as applied in $label"
    docker run --rm --network dc-shared --env-file "$env_file" \
        -v "$REPO_ROOT/prisma:/app/prisma:ro" \
        "ghcr.io/$GHCR_OWNER/deliverycentral-backend:latest" \
        sh -c '
            cd /app
            for m in $(ls prisma/migrations | grep -v "^\." | sort); do
                node_modules/.bin/prisma migrate resolve --applied "$m" >/dev/null 2>&1 || true
            done
        '
}

for spec in "workload_tracking_prod:prod_user:$ENV_PROD:dc-prod" \
            "workload_tracking_staging:staging_user:$ENV_STAGING:dc-staging"; do
    db=$(echo "$spec" | cut -d: -f1)
    user=$(echo "$spec" | cut -d: -f2)
    env_file=$(echo "$spec" | cut -d: -f3)
    label=$(echo "$spec" | cut -d: -f4)
    if db_initialized "$db"; then
        ok "$db already initialized — skipping baseline"
    else
        apply_baseline "$db" "$user" || die "baseline application failed for $db"
        mark_migrations_applied "$env_file" "$label"
        ok "$db: baseline applied + migrations marked"
    fi
done

# -----------------------------------------------------------------------------
step "8/10  Bring up prod + staging app stacks"

deploy_stack() {
    local dir="$1" project="$2" env_file="$3"
    cd "$dir"
    # Extract image vars via grep — sourcing .env files trips on values with
    # spaces or shell metachars (e.g. bcrypt hashes contain $).
    local BACKEND_IMAGE FRONTEND_IMAGE
    BACKEND_IMAGE=$(grep '^BACKEND_IMAGE='  "$env_file" | head -1 | cut -d= -f2- | tr -d '"')
    FRONTEND_IMAGE=$(grep '^FRONTEND_IMAGE=' "$env_file" | head -1 | cut -d= -f2- | tr -d '"')
    export BACKEND_IMAGE FRONTEND_IMAGE
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

docker restart dc-data-caddy-1 >/dev/null
ok "caddy restarted to discover upstreams"

# -----------------------------------------------------------------------------
# NOTE: data seeding is no longer the bootstrap's job. The first browser hit
# to https://$PROD_DOMAIN/ (or /setup directly) lands on the in-app setup
# wizard, which collects admin credentials, validates the schema, and runs
# one of the install paths (Demo / Quick-start preset / Full clean) against
# the running backend. Token is printed to `docker logs dc-prod-backend-1`
# at first boot. See memory/project-setup-wizard.md for the design.

# -----------------------------------------------------------------------------
step "9/9   Backup cron + health verification"
cp "$REPO_ROOT/ops/backup.sh" /opt/backups/backup.sh
chmod +x /opt/backups/backup.sh
( crontab -l 2>/dev/null | grep -v 'deliverycentral-backup'; \
  echo '0 3 * * * /opt/backups/backup.sh >> /var/log/dc-backup.log 2>&1 # deliverycentral-backup' \
) | crontab -
sudo touch /var/log/dc-backup.log
sudo chown deploy:deploy /var/log/dc-backup.log
ok "daily backup cron installed (03:00 UTC) → /var/log/dc-backup.log"

sleep 20
verify() {
    local url="$1" expect="$2"
    if curl -sf "$url" | grep -q "$expect"; then ok "$url"
    else warn "$url did NOT match $expect — check logs"; fi
}
verify "https://$PROD_DOMAIN/api/health"          '"status":"ok"'
verify "https://$PROD_DOMAIN/api/health/deep"     '"status":"ready"'
verify "https://$STAGING_DOMAIN/api/health"       '"status":"ok"'
verify "https://$STAGING_DOMAIN/api/health/deep"  '"status":"ready"'

# -----------------------------------------------------------------------------
echo
printf "${C_BOLD}========================  DEPLOYMENT SUMMARY  ========================${C_OFF}\n"
echo
echo "  Production:  https://$PROD_DOMAIN"
echo "  Staging:     https://$STAGING_DOMAIN"
echo
printf "${C_BOLD}  Next step: complete first-run setup via the in-app wizard.${C_OFF}\n"
echo
echo "  1. Browse to:        https://$PROD_DOMAIN/setup"
echo "  2. Fetch the token:  docker logs dc-prod-backend-1 2>&1 | grep SETUP_TOKEN"
echo "  3. Paste the token, walk the 8 wizard screens, pick an install path"
echo "     (Demo / Quick-start preset / Full clean). Repeat at /setup on the"
echo "     staging URL."
echo
echo "  The wizard collects admin credentials, validates the schema, applies"
echo "  any pending migrations, and runs the chosen seed. See"
echo "  memory/project-setup-wizard.md for the design and recovery flows."
echo
echo "  Monitor / Logs basic auth (when --profile monitoring is up):"
echo "    user: admin"
echo "    pass: $MONITOR_PW"
echo "    URLs: https://$MONITOR_DOMAIN  https://$LOGS_DOMAIN"
echo
echo "  Backups: /opt/backups/  (daily at 03:00 UTC, log: /var/log/dc-backup.log)"
echo "  Restore drill: bash ops/restore-from-backup.sh --file /opt/backups/prod-<date>.sql.gz --target-db restore_test"
echo
warn "Save the monitor password to a password manager NOW. It's also in"
warn "  /opt/deliverycentral-data/.env (chmod 600) but not anywhere else."
echo
printf "${C_GRN}${C_BOLD}Bootstrap complete — open the wizard URL to finish setup.${C_OFF}\n"
