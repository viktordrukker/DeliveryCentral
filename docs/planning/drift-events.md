# DM-R-14 — Structured Drift Events

**Status:** Active. Every event below is emitted as a single line of JSON on
stdout, prefixed with the literal string `DRIFT_EVENT ` so log drains can
filter with one `grep DRIFT_EVENT`.

**Sinks:**
- **Default:** stdout line (log drain / CI log / `docker logs`). Operators
  grep live with `docker logs backend | grep DRIFT_EVENT`.
- **Optional:** set `DRIFT_WEBHOOK_URL=<url>` — every event is also POSTed
  as JSON to that endpoint. Webhook failures never block the emitter. This
  is the hook for Sentry / Slack / PagerDuty / Grafana Loki once an
  alerting stack lands.

## Event envelope (stable)

```json
{
  "event":       "<dotted.event.name>",
  "severity":    "error" | "warn" | "info",
  "timestamp":   "<ISO-8601 UTC>",
  "service":     "delivery-central",
  "hostname":    "<os.hostname()>",
  "git_sha":     "<40-char git HEAD>" | "unknown",
  "agent_id":    "<AGENT_ID env>" | null,
  "payload":     { ...event-specific fields... }
}
```

## Known events

| Event name | Emitter | Severity | Payload | Recommended alert |
|------------|---------|----------|---------|-------------------|
| `schema.drift.detected` | `scripts/prestart-verify-migrations.sh` (Layer 1) | error | `source: "prisma.migrate.status"`, `summary: <string>` | **Page immediately** — backend is refusing to boot. |
| `migration.half_applied.detected` | `scripts/verify-migrations-deep.cjs` | error | `migration_name: <string>`, `started_at: <ISO>` | **Page immediately** — DB is mid-apply, serving is unsafe. |
| `migration.name.monotonicity.violation` | `scripts/verify-migrations-deep.cjs` | error | `latest_applied: <name>`, `latest_on_disk: <name>` | **Page** — DB is ahead of the checked-out branch. |

## Adding a new event

1. Pick a dotted name in the `<area>.<thing>.<verb>` pattern (`schema.hash.mismatch.detected`, not `hash_mismatch`).
2. Emit via `require('scripts/lib/drift-events.cjs').emitEvent(name, payload, severity)`.
3. Add a row to the table above with expected payload and recommended alert severity.
4. Update the lint: no new grep-worthy event name without a row here.

## Sinking into Sentry / Slack / PagerDuty

Set `DRIFT_WEBHOOK_URL=<endpoint>` on the backend process. The endpoint
receives the same JSON as the stdout line. 2-second timeout; webhook
failures are swallowed (alerting must never block the backend).

## Grep recipes

```bash
# Everything drift-related in the last 24 hours
docker logs backend --since 24h | grep DRIFT_EVENT

# Only errors
docker logs backend | grep DRIFT_EVENT | jq -c 'select(.severity=="error")'

# Per-agent breakdown
docker logs backend | grep DRIFT_EVENT | jq -r '.agent_id' | sort | uniq -c
```
