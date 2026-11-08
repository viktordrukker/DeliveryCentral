# ROLLBACK_DRILL Runbook

Automated drill that proves a v2 cutover can be reverted within budget.

The C0 flip turns on `flag.dsRefresh` (and, separately, `flag.workspaceMe`)
by default. If post-cutover telemetry shows trouble, operators flip the
PlatformSetting back to `false` and traffic should immediately stop seeing
the new behaviour. This drill measures *how long that immediate is*.

## When to run

- Before the C0 flip — capture a baseline rollback latency on v2-staging.
- After any change to feature-flag plumbing (`PlatformSettingsService`,
  the runtime-flag cache, the `useFlag()` hook).
- Once per week while v2-staging is live — drift detection.

**Never** run against production. The `scripts/rollback-drill.cjs` script
refuses obvious prod URLs but a hand-crafted URL could bypass the check.

## What it does

`scripts/rollback-drill.cjs`, on each of 5 iterations:

1. PATCHes the target PlatformSetting (default `flag.dsRefresh`) to `true`.
2. Polls `GET /api/_internal/runtime-flags?key=<key>` until the resolved
   value reflects `true`. This proves the flip propagated.
3. PATCHes the same key back to `false` and starts a stopwatch.
4. Polls again until the resolved value reads `false`. The stopwatch
   reading is the **rollback latency** for that iteration.
5. After 5 iterations, prints P50 / P95 / MAX and compares the worst
   observed rollback against the budget (default 30 000 ms).

It always restores the original value on exit, even if a poll times out.

## How to run manually

```bash
# from a workstation that can reach v2-staging
ROLLBACK_DRILL_TARGET=https://deliverit-test-v2.agentic.uz \
ROLLBACK_DRILL_ADMIN_TOKEN=<paste-admin-bearer> \
node scripts/rollback-drill.cjs
```

JSON output (used by the workflow):

```bash
node scripts/rollback-drill.cjs --json
```

Override the target key (must be a boolean PlatformSetting):

```bash
node scripts/rollback-drill.cjs --key flag.workspaceMe
```

## How to run via GitHub Actions

`Actions → v2-rollback-drill → Run workflow`. Inputs:

| Input              | Default                                | Meaning                                            |
|--------------------|----------------------------------------|----------------------------------------------------|
| `base_url`         | (uses `secrets.V2_STAGING_BASE_URL`)   | Full URL of the target (no trailing slash).        |
| `flag_key`         | `flag.dsRefresh`                       | Boolean PlatformSetting to flip.                   |
| `iterations`       | `5`                                    | Flip/revert cycles.                                |
| `max_rollback_ms`  | `30000`                                | Per-iteration budget. Run fails if exceeded.       |
| `poll_interval_ms` | `500`                                  | Poll cadence.                                      |
| `poll_timeout_ms`  | `60000`                                | Per-iteration poll budget.                         |

Secrets required:

- `V2_STAGING_ADMIN_TOKEN` — bearer token for an admin on the target.
- `V2_STAGING_BASE_URL` — optional default URL.

The job uploads `drill-summary.json` as an artifact (30-day retention).

## What good looks like

```text
[drill] === summary ===
[drill] iterations: 5
[drill] P50 rollback: 612 ms
[drill] P95 rollback: 1 184 ms
[drill] MAX rollback: 1 184 ms
[drill] budget:       30 000 ms
[drill] verdict:      PASS
```

- P50 well under a second: cache invalidation works.
- P95 under a few seconds: no slow consumer.
- MAX inside the budget: every iteration cleared the bar.

## What bad looks like

- **MAX > 30 s** — propagation is too slow for an emergency revert.
  Investigate the runtime-flag cache TTL, downstream consumers polling
  too lazily, or upstream proxies caching the read path.
- **Drill aborts mid-iteration** — the `finally` block tries to restore
  the original value. If it logs "WARNING — failed to restore initial
  value", manually PATCH the key back to its pre-drill state immediately.

## Backend dependency

The drill reads `/api/_internal/runtime-flags?key=<key>` exposed by
`RuntimeFlagDebugController`. The route is admin-only and returns the
*resolved* value (DB override → PlatformSetting default). It exists only
for this drill — do not depend on it from application code.

## Wire-up

- Script: `scripts/rollback-drill.cjs`
- Workflow: `.github/workflows/v2-rollback-drill.yml`
- Controller: `src/modules/admin/presentation/runtime-flag-debug.controller.ts`
- Tests:
  - `test/unit/scripts/rollback-drill.spec.ts`
  - `test/unit/admin/runtime-flag-debug.controller.spec.ts`
