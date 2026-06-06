# C0 CUTOVER — QUICK REFERENCE

Keep this page open in a second terminal during the flip. Full procedure
in `CUTOVER_RUNBOOK.md`. Use this card for **just the three command
shapes** an SRE needs during execution.

---

## 1. Flip ON (staged)

```bash
# 5% bucket + flag ON (T+0).
ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"INSERT INTO \\\"PlatformSetting\\\"(key, value, \\\"updatedAt\\\") \
      VALUES('flag.dsRefresh.bucket', '5'::jsonb, NOW()) \
      ON CONFLICT (key) DO UPDATE SET value='5'::jsonb, \\\"updatedAt\\\"=NOW();\
    INSERT INTO \\\"PlatformSetting\\\"(key, value, \\\"updatedAt\\\") \
      VALUES('flag.dsRefresh.enabled', 'true'::jsonb, NOW()) \
      ON CONFLICT (key) DO UPDATE SET value='true'::jsonb, \\\"updatedAt\\\"=NOW();\""

# Step up: change '5' → '25' (T+30), '25' → '50' (T+45), '50' → '100' (T+2h).
# At 100%, also flip workspaceMe ON:
ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"INSERT INTO \\\"PlatformSetting\\\"(key, value, \\\"updatedAt\\\") \
      VALUES('flag.workspaceMe.enabled', 'true'::jsonb, NOW()) \
      ON CONFLICT (key) DO UPDATE SET value='true'::jsonb, \\\"updatedAt\\\"=NOW();\""
```

## 2. Rollback (≤30s target)

```bash
ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"UPDATE \\\"PlatformSetting\\\" \
      SET value='false'::jsonb, \\\"updatedAt\\\"=NOW() \
      WHERE key IN ('flag.dsRefresh.enabled','flag.workspaceMe.enabled');\""

# Force cache flush (optional, drops the 30s natural decay).
curl -sf -X POST -H "X-Internal-Auth: $INTERNAL_FLUSH_TOKEN" \
  https://prod.deliverit.agentic.uz/api/_internal/cache/flush
```

## 3. Status check

```bash
# Current flag rows.
ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"SELECT key, value, updatedAt FROM \\\"PlatformSetting\\\" \
      WHERE key LIKE 'flag.dsRefresh%' OR key LIKE 'flag.workspaceMe%' \
      ORDER BY key;\""

# Live flag share.
curl -sf https://prod.deliverit.agentic.uz/api/_internal/metrics/flag-share | \
  jq '.flags | {dsRefresh:.["flag.dsRefresh.enabled"], workspaceMe:.["flag.workspaceMe.enabled"]}'

# Readiness probe.
curl -sf https://prod.deliverit.agentic.uz/api/health/deep | jq '.status,.checks'
```

---

## Grafana dashboards

| Dashboard | URL |
|---|---|
| C0 flip live view | `https://grafana.deliverit.agentic.uz/d/c0-flip/c0-flip` |
| HTTP error rate + p95 | `https://grafana.deliverit.agentic.uz/d/http-overview/http-overview` |
| Flag-share split | `https://grafana.deliverit.agentic.uz/d/platform-flags/platform-flags` |

## Log queries

```
# Loki — 5xx spike during flip window.
{namespace="dc-prod",app="backend"} |= "status" | json | http_status >= 500

# Loki — flag-resolver cache evictions (sanity check that 30s TTL is firing).
{namespace="dc-prod",app="backend"} |= "PlatformFlagsService" |= "cache evict"

# Loki — workspaceMe vs legacy shell route hits, per minute.
sum by (route) (rate({namespace="dc-prod",app="frontend"} |= "/me" | json [1m]))
```

---

## Abort criteria (memorize)

- 5xx > baseline × 1.5 sustained ≥2 min → **rollback**
- p95 > baseline + 20% sustained ≥5 min → **rollback**
- Any open `c0-cutover` label ticket → **rollback**
- `/api/health/deep` not `"ready"` → **rollback**
- Director-of-Engineering or delivery-ops STOP → **rollback**

Full table + decision tree in `CUTOVER_RUNBOOK.md` Step 8.
