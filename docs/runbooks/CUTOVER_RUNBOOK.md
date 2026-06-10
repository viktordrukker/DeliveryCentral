# C0 CUTOVER RUNBOOK — `dsRefresh` + `workspaceMe` flip

**Audience:** on-call SRE executing the production C0 flip.
**Read time:** 12 min. **Execution time:** 2 hours.
**Authority to flip:** Director-of-Engineering sign-off + this runbook.
**Owner:** frontend-eng + delivery-ops.
**Last revised:** 2026-06-06 (Wave C, V2 master plan W18).

This runbook is the single source of truth for the C0 flip. The on-call SRE should
be able to run it from this doc alone, no tribal knowledge required. If anything
below contradicts another doc, this runbook wins until the conflict is reconciled
in writing.

---

## What this flip does

Switches two `PlatformSetting` rows from `false` → `true` on production:

| Setting key | Effect when ON | Default OFF until C0 |
|---|---|---|
| `flag.dsRefresh.enabled` | DS visual refresh consumer adoption (lifecycle Timeline colors, Calendar/BalanceMeter primitives, page chrome refresh). | YES |
| `flag.workspaceMe.enabled` | Unified `/me` Employee Workspace shell (Overview/Time/Leave/Projects/Inbox/Settings tabs). | YES |

Owning code: `src/shared/config/platform-flags.service.ts` (flag definitions
`dsRefresh` and `workspaceMe`). The flags are **DB-resolved at request time**
with a 30s in-process cache (`CacheEntry` map in `PlatformFlagsService`).
**No code deploy is required to flip — it is a single SQL UPDATE per flag.**

---

## Why this runbook exists

The C0 flip is the last gate of the V2 source-of-truth plan
(`/home/drukker/.claude/plans/v2-source-of-truth-2026-06-09.md` — supersedes
the v2-master-plan-2026-06-02 and all prior `v2-*`/`lean-*` plans). It is the only
externally-visible event in the 18-week chain. Every other piece of work — Phases
0–5 lean migration, Phase 6 safety nets — exists so this flip is boring.

Wave A (PRs #548, #549, #550) shipped the three Phase 6 baselines:

- **`V2-PLAYWRIGHT-BASELINE` (PR #548)** — 120 visual-regression snapshots
  (30 routes × 2 themes × 2 flag states). Shadow CI blocks any PR with >3%
  pixel delta.
- **`AXE-A11Y-BASELINE` (PR #549)** — axe-core WCAG-AA baseline on V2 pages
  + 8 DS atoms across light+dark themes.
- **`BUNDLE-SIZE-GATE` (PR #550)** — gzipped bundle delta cap of +15% vs
  commit 2026-05-01 baseline.

This runbook is gated on all three being green on `main`. If any goes red
between T-24h and T-0, the flip aborts.

> **Deferred item:** PR #534 (leave-cancel) is *not* gating C0; it ships
> post-flip in the v1.2 sprint per the deferral memo. Do not block on it.

---

## Pre-flight checklist (T-24h)

Complete every line. If any line is red, **the flip cannot proceed** and
delivery-ops must be paged.

### Baselines + safety nets

- [ ] **Playwright baseline green on main** — last 5 main pushes show
      `v2-playwright-baseline` job green. Threshold 3% pixel delta;
      no allowed exceptions added in the last 72h without sign-off.
      Verify:
      ```bash
      gh run list --workflow=v2-playwright-baseline.yml \
        --branch=main --limit=5 --json conclusion,headSha
      ```
- [ ] **Axe a11y baseline green on main** — last 5 main pushes show
      `v2-axe-baseline` job green.
      Verify:
      ```bash
      gh run list --workflow=v2-axe-baseline.yml \
        --branch=main --limit=5 --json conclusion,headSha
      ```
- [ ] **Bundle-size gate green on main** — last 5 main pushes show
      `bundle-size-check` job green; latest measurement reports delta
      ≤ +15% vs 2026-05-01 baseline.
      Verify:
      ```bash
      gh run list --workflow=bundle-size-check.yml \
        --branch=main --limit=5 --json conclusion,headSha
      ```
- [ ] **Lean-migration soak monitor green + 7-day gate passing** — the
      `v2-soak-monitor` cron (daily 07:00 UTC) has produced a snapshot for
      each of the trailing 7 days, and the 7-day acceptance gate passes
      (every snapshot reports zero divergence / zero orphaned-link probes).
      Verify:
      ```bash
      gh run list --workflow=v2-soak-monitor.yml \
        --limit=7 --json conclusion,createdAt
      npm run soak:check-7-day
      # Exit code must be 0 — any missing day or non-zero probe fails the gate.
      ```

### Soak + manual validation

- [ ] **v2-staging has been at dsRefresh=100% for ≥7 calendar days**
      (V2-SOAK-STAGING gate). Run:
      ```bash
      ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
        "docker compose -p dc-staging exec backend \
         psql -U app_runtime -d workload_tracking -A -t -c \
         \"SELECT updatedAt FROM \\\"PlatformSetting\\\" \
            WHERE key='flag.dsRefresh.enabled'\""
      ```
      The returned timestamp must be ≥7 days ago.
- [ ] **Soak SLO snapshot clean** — last 7 days on v2-staging show:
      zero P0/P1 incidents, error rate <5%, p95 latency ≤ baseline+20%,
      zero notification drops. Cross-check Grafana dashboard
      `https://grafana.deliverit-staging.agentic.uz/d/v2-soak/v2-soak`.
- [ ] **`MANUAL-CLICK-THROUGH-30-JOURNEYS` complete** — 30 journeys ×
      8 seed accounts (256 flows) executed on v2-staging with zero
      console errors and zero P0/P1 findings. Verify the click-through
      script and screenshot bundle is committed:
      ```bash
      ls docs/testing/c0-acceptance/ | grep -c '\.png$'
      # Must be ≥ 256 (one screenshot per flow minimum).
      ```
- [ ] **`ROLLBACK-DRILL` executed 5×, all ≤30s** — last 5 drill runs
      logged in `docs/testing/c0-acceptance/rollback-drill-log.md` with
      timestamp + observed `/api/health/deep` recovery time. All five
      must be `≤30s`.
- [ ] **Cutover status template ready** — copy of
      `docs/runbooks/cutover-status-template.md` opened in the
      incident channel; status owner named.

### Stakeholder + operations

- [ ] **Director-of-Engineering sign-off recorded** — written approval in
      `docs/planning/v2-c0-checklist.md` (Gate 22).
- [ ] **Bank-side stakeholders notified ≥24h ahead** — change-management
      ticket filed with bank-ops; flip window confirmed.
- [ ] **On-call rotation primed** — primary + secondary on-call SRE
      acknowledged; both have this runbook open + Grafana auth working.
- [ ] **Communication channel pinned** — incident channel created
      (`#c0-flip-YYYYMMDD`); template message ready for T+5 / T+30 /
      T+1h / T+2h status updates.
- [ ] **Diagnostic bundle endpoint reachable** — verify:
      ```bash
      curl -sf https://prod.deliverit.agentic.uz/api/health/deep | jq .status
      # Must return "ready".
      ```

If any of the above is red, **stop. Page delivery-ops. Do not flip.**

---

## T-0 — Execute the flip

The flip is two SQL `UPDATE`s, one per flag. Run them in order. **No code
deploy is required.** The 30s in-process cache means the rollout naturally
hits 100% of nodes within 30s without a restart.

### Step 1 — Confirm current state

```bash
ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"SELECT key, value, updatedAt FROM \\\"PlatformSetting\\\" \
      WHERE key IN ('flag.dsRefresh.enabled','flag.workspaceMe.enabled') \
      ORDER BY key;\""
```

**Expected:** both rows present with `value=false`, or both rows absent
(falls through to flag `default: false`). If either row reads `true`,
**stop** — investigate why it was flipped without this runbook.

### Step 2 — Flip `dsRefresh` to 5% bucket (T+0)

DeliveryCentral's `PlatformFlagsService` is binary (boolean). For staged
rollout we use a **separate per-bucket key** (`flag.dsRefresh.bucket`)
that the resolver inspects when the canonical flag is `true`. Buckets are
`5`, `25`, `50`, `100` (percentages). The resolver uses
`hash(personId) % 100 < bucket` for stable per-user assignment.

```bash
ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"INSERT INTO \\\"PlatformSetting\\\"(key, value, \\\"updatedAt\\\") \
      VALUES('flag.dsRefresh.bucket', '5'::jsonb, NOW()) \
      ON CONFLICT (key) DO UPDATE SET value='5'::jsonb, \\\"updatedAt\\\"=NOW();\""

ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"INSERT INTO \\\"PlatformSetting\\\"(key, value, \\\"updatedAt\\\") \
      VALUES('flag.dsRefresh.enabled', 'true'::jsonb, NOW()) \
      ON CONFLICT (key) DO UPDATE SET value='true'::jsonb, \\\"updatedAt\\\"=NOW();\""
```

**Time-stamp** the flip in the incident channel.

### Step 3 — T+5 min checkpoint

Wait 5 minutes (30s cache TTL × ~10 safety buffer for log aggregation).
Then verify:

```bash
# 1. dsRefresh=true traffic share ≥5%, ≤8%.
curl -sf https://prod.deliverit.agentic.uz/api/_internal/metrics/flag-share | \
  jq '.flags["flag.dsRefresh.enabled"]'

# 2. No 5xx spike. Compare 5xx count over last 5 min vs prior 60 min baseline.
curl -sf "https://grafana.deliverit.agentic.uz/api/datasources/proxy/1/api/v1/query?query=sum(rate(http_requests_total{status=~'5..'}[5m]))" | \
  jq '.data.result[0].value[1] | tonumber'

# 3. /api/health/deep still "ready".
curl -sf https://prod.deliverit.agentic.uz/api/health/deep | jq .status
```

**Pass criteria:** all three below must hold.
- dsRefresh=true share is in `[3, 8]` (jitter tolerated).
- 5xx rate ≤ baseline × 1.5.
- `/api/health/deep` = `"ready"`.

**Fail action:** if any criterion fails, **abort. Run the rollback in
Step 8** within 30s. Do not advance to T+30.

Post T+5 status using `cutover-status-template.md`.

### Step 4 — T+30 min checkpoint (rollback decision point #1)

This is the first formal rollback decision point. Inspect:

```bash
# 1. Error budget burn.
curl -sf "https://grafana.deliverit.agentic.uz/api/datasources/proxy/1/api/v1/query?query=sum(rate(http_requests_total{status=~'5..'}[30m]))/sum(rate(http_requests_total[30m]))" | \
  jq '.data.result[0].value[1] | tonumber'

# 2. p95 latency delta.
curl -sf "https://grafana.deliverit.agentic.uz/api/datasources/proxy/1/api/v1/query?query=histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket[30m]))by(le))" | \
  jq '.data.result[0].value[1] | tonumber'

# 3. Customer complaint queue (Linear C0 label).
gh issue list --label "c0-cutover" --state open --json number,title | \
  jq 'length'
```

**Pass criteria:**
- Error rate <5%.
- p95 latency delta ≤ +20% vs the same hour yesterday.
- Zero open `c0-cutover` complaint tickets.

**Fail action:** if any criterion fails, **abort. Run rollback (Step 8).**

If green, advance. Post T+30 status.

### Step 5 — T+1h: rollout to 25% then 50%

Move the bucket forward in two ≈15 min steps so the resolver re-shards
without thundering-herd. Each sub-step needs its own ≥5 min observation
window.

```bash
# 25% rollout
ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"UPDATE \\\"PlatformSetting\\\" SET value='25'::jsonb, \\\"updatedAt\\\"=NOW() \
      WHERE key='flag.dsRefresh.bucket';\""
# Wait 15 min. Verify dsRefresh=true share is in [22, 28].

# 50% rollout
ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"UPDATE \\\"PlatformSetting\\\" SET value='50'::jsonb, \\\"updatedAt\\\"=NOW() \
      WHERE key='flag.dsRefresh.bucket';\""
# Wait 15 min. Verify dsRefresh=true share is in [47, 53].
```

Repeat the Step 3 + Step 4 verification triple after each move. If any
move fails the criteria, **abort. Roll back (Step 8).**

Post T+1h status.

### Step 6 — T+2h: rollout to 100% + flip `workspaceMe`

```bash
# 100% dsRefresh.
ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"UPDATE \\\"PlatformSetting\\\" SET value='100'::jsonb, \\\"updatedAt\\\"=NOW() \
      WHERE key='flag.dsRefresh.bucket';\""

# workspaceMe binary ON.
ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"INSERT INTO \\\"PlatformSetting\\\"(key, value, \\\"updatedAt\\\") \
      VALUES('flag.workspaceMe.enabled', 'true'::jsonb, NOW()) \
      ON CONFLICT (key) DO UPDATE SET value='true'::jsonb, \\\"updatedAt\\\"=NOW();\""
```

### Step 7 — T+2h verification

```bash
# 1. dsRefresh=true share ≥99% of traffic.
curl -sf https://prod.deliverit.agentic.uz/api/_internal/metrics/flag-share | \
  jq '.flags["flag.dsRefresh.enabled"]'

# 2. workspaceMe=true share ≥99% of traffic.
curl -sf https://prod.deliverit.agentic.uz/api/_internal/metrics/flag-share | \
  jq '.flags["flag.workspaceMe.enabled"]'

# 3. /api/health/deep "ready".
curl -sf https://prod.deliverit.agentic.uz/api/health/deep | jq .status

# 4. Sample real-user flow — log in as `lucas.reed@itco.local` and verify
#    the /me workspace shell renders + DS refresh chrome is visible.
#    Screenshot the dashboard + Time tab and attach to incident channel.
```

**Pass criteria:** all four green. If pass, declare C0 flipped. Post T+2h
status. Sign off Gate 22 in `docs/planning/v2-c0-checklist.md`.

---

## Step 8 — Rollback procedure

Rollback is **two SQL UPDATEs**. Target: `/api/health/deep` returns
`"ready"` and dsRefresh=true share <1% **within 30 seconds**.

```bash
# Flip both flags back to false. Use SET, not DELETE — keeps audit trail.
ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124 \
  "docker compose -p dc-prod exec backend \
   psql -U app_runtime -d workload_tracking -c \
   \"UPDATE \\\"PlatformSetting\\\" \
      SET value='false'::jsonb, \\\"updatedAt\\\"=NOW() \
      WHERE key IN ('flag.dsRefresh.enabled','flag.workspaceMe.enabled');\""

# (Optional) Force cache flush so the rollback hits ≤1s rather than ≤30s.
curl -sf -X POST -H "X-Internal-Auth: $INTERNAL_FLUSH_TOKEN" \
  https://prod.deliverit.agentic.uz/api/_internal/cache/flush
```

### Rollback verification (must complete in 30s)

```bash
# Flag share back to ~0%.
curl -sf https://prod.deliverit.agentic.uz/api/_internal/metrics/flag-share | \
  jq '.flags["flag.dsRefresh.enabled"]'
# Expect 0 (or <1 if some requests are in flight when measured).

# /api/health/deep ready.
curl -sf https://prod.deliverit.agentic.uz/api/health/deep | jq .status
# Expect "ready".

# 5xx rate returning to baseline.
curl -sf "https://grafana.deliverit.agentic.uz/api/datasources/proxy/1/api/v1/query?query=sum(rate(http_requests_total{status=~'5..'}[5m]))" | \
  jq '.data.result[0].value[1] | tonumber'
```

The drilled rollback time is ≤30s. If you observe >30s on production,
file a P0 incident immediately — the drill assumption broke.

### Rollback decision tree

```
Any of these triggers → rollback NOW:
  - 5xx rate > baseline × 1.5 sustained ≥2 min
  - p95 latency > baseline + 20% sustained ≥5 min
  - Any open c0-cutover-labelled ticket
  - Director-of-Engineering or delivery-ops explicit STOP
  - /api/health/deep returns anything other than "ready"
  - dsRefresh=true share diverges from target bucket by >5pp

Borderline (need human call) → page delivery-ops:
  - Error rate 3–5% (within budget but trending up)
  - p95 latency +10..+20% (within budget but trending up)
  - User complaints below the 'c0-cutover' label

Green (advance) → all gauges within budget, no complaints.
```

---

## Post-flip cleanup (T+24h)

- [ ] **Smoke the 142-item manual test plan.** Time-box 4 hours.
      Doc: `docs/testing/MANUAL_TEST_PLAN.md`. Any P0/P1 finding triggers
      either a hotfix or a rollback.
- [ ] **Sign off `docs/planning/v2-c0-checklist.md` Gate 22.** Mark the
      flip date + flipper name + Director sign-off.
- [ ] **Archive incident channel** to `#archive`. Pin the cutover-status
      doc as the canonical record.
- [ ] **Update `docs/planning/current-state.md`** — move dsRefresh and
      workspaceMe from "flag-gated" to "default-on".
- [ ] **Schedule Wave-C retrospective** for T+7d to capture what to
      change in the next flip.
- [ ] **Open follow-up issue for deferred PR #534** (leave-cancel) —
      reschedule for v1.2.
- [ ] **Decommission the bucket key.** After 7 days at 100%:
      ```sql
      DELETE FROM "PlatformSetting" WHERE key='flag.dsRefresh.bucket';
      ```

---

## Reference

- **Source-of-truth plan:** `/home/drukker/.claude/plans/v2-source-of-truth-2026-06-09.md`
  (supersedes `v2-master-plan-2026-06-02.md` and all prior `v2-*`/`lean-*` plans)
- **Plan items shipped by this runbook:** `CUTOVER_RUNBOOK`,
  `ROLLBACK-DRILL`, `MANUAL-CLICK-THROUGH-30-JOURNEYS` (gate; this doc
  references but does not produce the artifact).
- **Wave A baselines:** `V2-PLAYWRIGHT-BASELINE` (PR #548),
  `AXE-A11Y-BASELINE` (PR #549), `BUNDLE-SIZE-GATE` (PR #550).
- **Quick-ref card:** `docs/runbooks/CUTOVER_RUNBOOK_QUICKREF.md` — keep
  open in a second terminal during the flip.
- **Status template:** `docs/runbooks/cutover-status-template.md` — copy
  per checkpoint into the incident channel.
- **C0 gate ledger:** `docs/planning/v2-c0-checklist.md` — 22 gate items
  (10 technical + 12 user-visible).
- **Memory:** `feedback-v2-build-fully-before-cutover` — the C0 flip is
  the LAST step; do not pre-flip on regular staging.

## Glossary

- **dsRefresh** — the v2 design-system visual refresh flag.
- **workspaceMe** — the unified `/me` Employee Workspace shell flag.
- **C0** — the customer-zero cutover, i.e. when prod traffic sees v2.
- **Bucket** — staged-rollout percentage (5/25/50/100) controlling the
  share of users seeing dsRefresh=true.
- **`/api/health/deep`** — readiness probe that exercises DB +
  PlatformFlags + outbox + key services. `"status":"ready"` means safe
  to advance.
- **30s cache TTL** — `PlatformFlagsService` per-process cache; a flag
  flip propagates to all nodes within 30s without restart.
