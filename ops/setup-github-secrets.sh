#!/usr/bin/env bash
# setup-github-secrets.sh — Phase 5 of the Hetzner deployment plan.
#
# Run from your laptop, in the repo root, after:
#   1. ops/bootstrap-vm.sh has finished on the VM
#   2. You have pulled the GHA SSH private key down:
#        scp deploy@<VM_IP>:~/.ssh/gha /tmp/gha-private-key
#
# Pre-requisites:
#   - gh CLI installed and authenticated (`gh auth status`)
#   - In a git checkout of this repo
#
# What it does:
#   - Pushes 8 secrets via `gh secret set`
#   - Pushes 2 repository variables via `gh variable set`
#   - Reminds you to enable Environments (staging, production) in repo settings
#     so the deploy.yml gates work

set -euo pipefail

C_BOLD='\033[1m'; C_GRN='\033[0;32m'; C_YEL='\033[0;33m'; C_RED='\033[0;31m'; C_OFF='\033[0m'
ok()   { printf "    ${C_GRN}✓ %s${C_OFF}\n" "$*"; }
warn() { printf "    ${C_YEL}! %s${C_OFF}\n" "$*"; }
die()  { printf "    ${C_RED}✗ %s${C_OFF}\n" "$*" >&2; exit 1; }

command -v gh >/dev/null 2>&1 || die "gh CLI not found. Install from https://cli.github.com/ and run 'gh auth login' first"
gh auth status >/dev/null 2>&1 || die "gh CLI is not authenticated. Run: gh auth login"
[ -f .git/config ] || die "run this from the repo root (no .git/config found)"

KEY_FILE="${KEY_FILE:-/tmp/gha-private-key}"
[ -f "$KEY_FILE" ] || die "SSH private key not found at $KEY_FILE. Pull it from the VM: scp deploy@<VM_IP>:~/.ssh/gha $KEY_FILE"

read -rp "VM IP or hostname (the 'host' in SSH): " VPS_HOST
read -rp "Production domain (e.g. app.example.com): " PROD_DOMAIN
read -rp "Staging domain   (e.g. staging.example.com): " STAGING_DOMAIN

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
printf "${C_BOLD}Pushing to GitHub repo: %s${C_OFF}\n" "$REPO"

set_secret() {
    local name="$1" value="$2"
    printf '%s' "$value" | gh secret set "$name" --body -
    ok "secret  $name"
}

set_var() {
    local name="$1" value="$2"
    gh variable set "$name" --body "$value"
    ok "variable $name = $value"
}

# Secrets ---------------------------------------------------------------
set_secret VPS_HOST              "$VPS_HOST"
set_secret VPS_USER              "deploy"
set_secret VPS_SSH_KEY           "$(cat "$KEY_FILE")"
set_secret STAGING_VPS_HOST      "$VPS_HOST"
set_secret STAGING_VPS_USER      "deploy"
set_secret STAGING_VPS_SSH_KEY   "$(cat "$KEY_FILE")"
set_secret CADDY_DOMAIN          "$PROD_DOMAIN"
set_secret STAGING_CADDY_DOMAIN  "$STAGING_DOMAIN"

# Variables -------------------------------------------------------------
set_var STAGING_DEPLOY_ENABLED    true
set_var PRODUCTION_DEPLOY_ENABLED true

echo
warn "DELETE the local key file now:"
warn "    shred -u $KEY_FILE 2>/dev/null || rm -P $KEY_FILE"
echo
warn "GitHub Environments — open these URLs and click 'Configure environment' if they 404:"
warn "    https://github.com/$REPO/settings/environments/new (create 'staging')"
warn "    https://github.com/$REPO/settings/environments/new (create 'production')"
warn "Add a 'Required reviewers' rule on 'production' if you want manual approval gates."
echo
printf "${C_GRN}${C_BOLD}Secrets + variables pushed.${C_OFF}\n"
echo "Next: push to main to trigger the first end-to-end deploy."
