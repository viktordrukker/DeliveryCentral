#!/usr/bin/env bash
# verify-deploy.sh — post-deploy health matrix.
#
# Usage:
#   bash ops/verify-deploy.sh app.example.com staging.example.com
#
# Runs every health check from the deployment plan and prints a pass/fail
# table. Non-zero exit if any required check fails.

set -uo pipefail

PROD_DOMAIN="${1:-}"
STAGING_DOMAIN="${2:-}"
[ -n "$PROD_DOMAIN" ] && [ -n "$STAGING_DOMAIN" ] || {
    echo "Usage: $0 <prod-domain> <staging-domain>"
    exit 2
}

C_GRN='\033[0;32m'; C_RED='\033[0;31m'; C_YEL='\033[0;33m'; C_OFF='\033[0m'
PASS=0; FAIL=0
row() {
    local status="$1" name="$2" detail="${3:-}"
    case "$status" in
        PASS) printf "  ${C_GRN}✓ PASS${C_OFF}  %-50s %s\n" "$name" "$detail"; PASS=$((PASS+1)) ;;
        FAIL) printf "  ${C_RED}✗ FAIL${C_OFF}  %-50s %s\n" "$name" "$detail"; FAIL=$((FAIL+1)) ;;
        WARN) printf "  ${C_YEL}? WARN${C_OFF}  %-50s %s\n" "$name" "$detail" ;;
    esac
}

check_status() {
    local url="$1" expected_substr="$2" name="$3"
    local body
    if body=$(curl -sf --max-time 10 "$url" 2>/dev/null); then
        if echo "$body" | grep -q "$expected_substr"; then
            row PASS "$name" "($url)"
        else
            row FAIL "$name" "expected '$expected_substr' not in response: $(echo "$body" | head -c 80)"
        fi
    else
        row FAIL "$name" "($url) — request failed (curl rc=$?)"
    fi
}

check_tls() {
    local domain="$1" name="$2"
    local expiry
    expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain":443 2>/dev/null \
             | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$expiry" ]; then
        row PASS "$name" "expires $expiry"
    else
        row FAIL "$name" "no TLS cert presented"
    fi
}

check_rate_limit() {
    local url="$1"
    local twos zerotwonines
    twos=0; fourtwonines=0
    for _ in $(seq 1 120); do
        local code
        code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo 000)
        case "$code" in
            200) twos=$((twos+1)) ;;
            429) fourtwonines=$((fourtwonines+1)) ;;
        esac
    done
    if [ "$fourtwonines" -ge 5 ]; then
        row PASS "rate limit fires after ~100 req/min" "($twos OK, $fourtwonines 429s)"
    else
        row WARN "rate limit may not be configured" "($twos OK, $fourtwonines 429s — expected ≥5 429s)"
    fi
}

echo
printf "${C_GRN}Verifying deploy health for %s + %s${C_OFF}\n\n" "$PROD_DOMAIN" "$STAGING_DOMAIN"

# Reachability + TLS
check_tls "$PROD_DOMAIN"    "prod TLS cert"
check_tls "$STAGING_DOMAIN" "staging TLS cert"

# Shallow health
check_status "https://$PROD_DOMAIN/api/health"    '"status":"ok"'    "prod /api/health"
check_status "https://$STAGING_DOMAIN/api/health" '"status":"ok"'    "staging /api/health"

# Deep health (DM-R-8) — every aggregate root reachable via Prisma
check_status "https://$PROD_DOMAIN/api/health/deep"    '"status":"ready"' "prod /api/health/deep"
check_status "https://$STAGING_DOMAIN/api/health/deep" '"status":"ready"' "staging /api/health/deep"

# Readiness
check_status "https://$PROD_DOMAIN/api/readiness"    '"status":"ready"' "prod /api/readiness"
check_status "https://$STAGING_DOMAIN/api/readiness" '"status":"ready"' "staging /api/readiness"

# Frontend reachable
check_status "https://$PROD_DOMAIN/"    'html'  "prod / (HTML served)"
check_status "https://$STAGING_DOMAIN/" 'html'  "staging / (HTML served)"

# Rate limit (slow — 120 requests; comment out if you don't want to wait ~30s)
echo
echo "  Running rate-limit probe (~30s — 120 requests)..."
check_rate_limit "https://$PROD_DOMAIN/api/health"

echo
printf "Total: ${C_GRN}%d passed${C_OFF}, ${C_RED}%d failed${C_OFF}\n" "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
