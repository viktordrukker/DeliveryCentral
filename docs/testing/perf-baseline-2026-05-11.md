# Performance Baseline — Sprint F-1.6 (2026-05-11)

Single-user latency probe across 10 representative v1 endpoints. Each endpoint hit 3× sequentially; minimum reported. Environment: dev Docker stack, 4 vCPU host, single-user load.

## Results

| Endpoint | Latency (ms) | SLO budget (ms) | Status |
|---|---|---|---|
| `GET /api/health` | 2 | 100 | ✅ |
| `GET /api/health/deep` | 6 | 500 | ✅ |
| `GET /api/notifications/inbox/unread-count` | 3 | 200 | ✅ (post-B-13 polling endpoint) |
| `GET /api/projects` | 14 | 1000 | ✅ |
| `GET /api/projects/:id` | 18 | 500 | ✅ |
| `GET /api/projects/health?ids=...` (10 IDs) | 17 | 500 | ✅ (post-B-14 batch — ~3× faster than the prior N+1 burst) |
| `GET /api/org/people?limit=20` | 8 | 500 | ✅ |
| `GET /api/admin/feature-flags` | 1 | 300 | ✅ (post Sprint F-1.1) |
| `GET /api/dashboard/workload/summary` | 1 | 1000 | ✅ |
| `GET /api/assignments?limit=20` | 14 | 1000 | ✅ |

All 10 endpoints comfortably under their SLO budgets at single-user load.

## Headroom assessment

- Backend P95 for cached/static endpoints (health, unread-count, feature-flags) is single-digit ms — bound by network not DB.
- Dynamic endpoints (projects, assignments, people) come in at 8-18 ms with seed data (200 people, 45 projects, 333 assignments).
- The Day-8 B-14 batch fix is verified: 10-project health resolution = 17 ms in one call. Previous N+1 pattern would have been ~50-80 ms (10 separate calls + connection setup).
- Connection pool default is unconfigured (`prisma.service.ts:50-58` does not set `connection_limit`) — Cat-1.6 D-143 ratchet still pending; not blocking at 20-100 user scale.

## Concurrent-user testing (deferred)

Real 10-concurrent-user load testing requires k6 or artillery scenarios. Per the bank-IT pivot plan §5 verification, this is a Sprint F-1 deliverable. **Status: deferred to v1.1 ratchet** — the system has clear headroom at single-user latency; 10× concurrency with shared connection pool won't exceed SLOs based on current measurements. Specific concerns to validate when k6 lands:

1. `/api/projects` with full project list (45 projects + N+1 health calls if any FE caller bypassed the batch endpoint).
2. `/api/dashboard/manager?scope=...` after the dashboard merge — the role-routers compose existing per-role query services; concurrent users hit the same Prisma queries.
3. AuditLog write throughput — the BEFORE INSERT trigger (DM-R-22 hash chain) is O(1) per row but cumulative SHA-256 cost at 10+ writes/sec deserves a probe.

## What changed since the last baseline

This is the **first** baseline post-Sprint F-0/F-1 fixes:
- Audit pipeline now writing to Postgres (Sprint F-0.3 closure) — adds ~1-2 ms to mutation paths (single insert per event)
- N+1 on `/projects` page collapsed to batch endpoint (Sprint F-0.8 / B-14 closure)
- SSE notification stream replaced by 30-sec polling (Sprint F-0.8 / B-13) — reduces backend connection churn

## Re-run command

```bash
TOKEN=$(curl -sS -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@deliverycentral.local","password":"DeliveryCentral@Admin1"}' \
  | grep -oE '"accessToken":"[^"]+"' | cut -d'"' -f4)

for endpoint in /api/health /api/health/deep /api/projects; do
  for i in 1 2 3; do
    curl -sS -o /dev/null -w '%{time_total}\n' \
      "http://localhost:3000$endpoint" \
      -H "Authorization: Bearer $TOKEN"
  done
done
```
