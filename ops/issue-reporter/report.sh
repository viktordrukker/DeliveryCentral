#!/usr/bin/env bash
# Watches Docker events for container crashes and health-failures on the host
# and files (or comments on) GitHub issues so code agents can pick them up.
#
# Requires:
#   ISSUE_REPORTER_GITHUB_TOKEN  - fine-grained PAT, scope: Issues RW + Metadata R
#   ISSUE_REPORTER_GITHUB_REPO   - "<owner>/<repo>"
#   ISSUE_REPORTER_ENVIRONMENT   - label suffix, e.g. "preprod"
# Mounts:
#   /var/run/docker.sock  (ro)
#   /host/current-sha     (ro, optional) - file containing the deployed commit SHA
#   /host/dozzle-url      (ro, optional) - file containing the public Dozzle URL

set -euo pipefail

: "${ISSUE_REPORTER_GITHUB_TOKEN:?token required}"
: "${ISSUE_REPORTER_GITHUB_REPO:?repo required}"
ENVIRONMENT="${ISSUE_REPORTER_ENVIRONMENT:-preprod}"
TAIL_LINES="${ISSUE_REPORTER_LOG_LINES:-200}"
OWN_CONTAINER="${ISSUE_REPORTER_OWN_CONTAINER:-deliverycentral-issue-reporter}"

CURRENT_SHA="unknown"
if [ -r /host/current-sha ]; then CURRENT_SHA="$(tr -d '[:space:]' </host/current-sha)"; fi
DOZZLE_URL=""
if [ -r /host/dozzle-url ]; then DOZZLE_URL="$(tr -d '[:space:]' </host/dozzle-url)"; fi

API="https://api.github.com/repos/${ISSUE_REPORTER_GITHUB_REPO}"
AUTH=(-H "Authorization: Bearer ${ISSUE_REPORTER_GITHUB_TOKEN}" -H "Accept: application/vnd.github+json")

log() { printf '[issue-reporter] %s\n' "$*" >&2; }

signature() {
  # First log line that contains "Error" or a stack-trace frame; fall back to first line.
  local name="$1" logs="$2" first
  first="$(printf '%s\n' "$logs" | grep -m1 -E 'Error|Exception|at [A-Za-z_]+ ' || printf '%s\n' "$logs" | head -n1)"
  printf '%s' "${name}::${first}" | sha1sum | cut -c1-12
}

short_reason() {
  # One-line summary for the issue title.
  local event="$1" logs="$2"
  case "$event" in
    health_status) printf 'unhealthy' ;;
    die)           printf 'exited'    ;;
    *)             printf '%s' "$event" ;;
  esac
  local first
  first="$(printf '%s\n' "$logs" | grep -m1 -E 'Error|Exception' | head -c 120 || true)"
  [ -n "$first" ] && printf ' — %s' "$first"
}

find_open_issue() {
  local sig="$1" labels="ops:autofile,env:${ENVIRONMENT},signature:${sig}"
  curl -fsS "${AUTH[@]}" \
    "${API}/issues?state=open&labels=$(printf '%s' "$labels" | jq -sRr @uri)" \
    | jq -r '.[0].number // empty'
}

ensure_labels() {
  # Best-effort: create the labels we use. Ignore already-exists (422).
  local sig="$1"
  for lbl in "ops:autofile|d73a4a" "env:${ENVIRONMENT}|0e8a16" "signature:${sig}|cfd3d7"; do
    local name color
    name="${lbl%|*}"; color="${lbl##*|}"
    curl -sS -o /dev/null -w '' "${AUTH[@]}" -X POST \
      -d "$(jq -nc --arg name "$name" --arg color "$color" '{name:$name,color:$color}')" \
      "${API}/labels" || true
  done
}

create_issue() {
  local sig="$1" title="$2" body="$3"
  jq -nc \
    --arg title "$title" \
    --arg body "$body" \
    --arg l1 "ops:autofile" \
    --arg l2 "env:${ENVIRONMENT}" \
    --arg l3 "signature:${sig}" \
    '{title:$title, body:$body, labels:[$l1,$l2,$l3]}' \
  | curl -fsS "${AUTH[@]}" -X POST -d @- "${API}/issues" | jq -r '.number'
}

add_comment() {
  local num="$1" body="$2"
  jq -nc --arg body "$body" '{body:$body}' \
  | curl -fsS "${AUTH[@]}" -X POST -d @- "${API}/issues/${num}/comments" >/dev/null
}

report() {
  local container="$1" event="$2" exit_code="$3"
  # Skip self.
  case "$container" in
    "${OWN_CONTAINER}"|*issue-reporter*) return ;;
  esac

  local logs sig title reason body existing when
  logs="$(docker logs --tail "$TAIL_LINES" "$container" 2>&1 || true)"
  sig="$(signature "$container" "$logs")"
  reason="$(short_reason "$event" "$logs")"
  when="$(date -u +%FT%TZ)"
  title="[${ENVIRONMENT}] ${container}: ${reason}"

  body=$(cat <<BODY
**Container**: \`${container}\`
**Event**: \`${event}\` (exit_code=${exit_code:-n/a})
**Environment**: \`${ENVIRONMENT}\`
**Deployed commit**: \`${CURRENT_SHA}\`
**First seen**: ${when}
**Signature**: \`${sig}\`
${DOZZLE_URL:+**Live logs**: ${DOZZLE_URL}}

<details><summary>Last ${TAIL_LINES} log lines</summary>

\`\`\`
${logs}
\`\`\`

</details>

_Opened automatically by \`issue-reporter\`. Subsequent occurrences with the same signature will add a comment rather than open a new issue._
BODY
)

  ensure_labels "$sig"
  existing="$(find_open_issue "$sig" || true)"
  if [ -n "$existing" ]; then
    log "recurrence on ${container} (sig=${sig}) — commenting on #${existing}"
    local comment
    comment=$(cat <<CMT
Recurrence at ${when} — \`${event}\` (exit_code=${exit_code:-n/a}) on commit \`${CURRENT_SHA}\`.

<details><summary>Last ${TAIL_LINES} log lines</summary>

\`\`\`
${logs}
\`\`\`

</details>
CMT
)
    add_comment "$existing" "$comment"
  else
    local n
    n="$(create_issue "$sig" "$title" "$body")"
    log "new incident on ${container} (sig=${sig}) — opened #${n}"
  fi
}

log "starting; repo=${ISSUE_REPORTER_GITHUB_REPO} env=${ENVIRONMENT} sha=${CURRENT_SHA}"

docker events \
  --format '{{json .}}' \
  --filter 'type=container' \
  --filter 'event=die' \
  --filter 'event=health_status' \
| while read -r raw; do
  # `docker events` emits JSON for `die` and a plain-text style for health_status on some
  # engines. Normalize both into fields we can switch on.
  action="$(printf '%s' "$raw" | jq -r '.Action // empty')"
  container="$(printf '%s' "$raw" | jq -r '.Actor.Attributes.name // .Attributes.name // empty')"
  exit_code="$(printf '%s' "$raw" | jq -r '.Actor.Attributes.exitCode // empty')"

  case "$action" in
    die)
      # docker's `die` fires on every exit; only treat non-zero as a failure.
      [ "${exit_code:-0}" != "0" ] && report "$container" die "$exit_code"
      ;;
    'health_status: unhealthy'|health_status*unhealthy*)
      report "$container" health_status ""
      ;;
  esac
done
