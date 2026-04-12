# Performance Baseline

## Purpose

This pack gives us a repeatable, Docker-only smoke baseline for enterprise-scale staffing data.

It is designed for:

- `10k+` people
- deep org hierarchy
- large project and assignment volumes
- meaningful work-evidence volume
- operational endpoint timing checks

It is not a microbenchmark suite and it is not a substitute for production APM.

## Dataset Profile

Use the `bank-scale` seed profile.

Current generated profile characteristics:

- people: `10,240`
- org units: demo baseline plus generated bank hierarchy
- resource pools / teams: `96+`
- projects: `1,500+`
- assignments: `24k+`
- work evidence: `30k+`

The profile is deterministic and includes explicit anomaly coverage for:

- work evidence without assignment
- assignment without evidence
- stale approval candidates
- closed projects with active assignments

## Docker Flow

Start the local runtime first:

```powershell
docker compose up -d backend frontend postgres
```

Seed the bank-scale dataset:

```powershell
docker compose exec -T backend npm run db:seed:bank-scale
```

Run the performance pack:

```powershell
docker compose exec -T backend npm run perf:bank-scale
```

Optional strict threshold enforcement:

```powershell
docker compose exec -T backend powershell -Command "$env:PERF_ENFORCE_THRESHOLDS='true'; npm run perf:bank-scale"
```

Optional JSON report output:

```powershell
docker compose exec -T backend powershell -Command "$env:PERF_OUTPUT_JSON='tmp/bank-scale-report.json'; npm run perf:bank-scale"
```

## Endpoint Coverage

The pack exercises these main paths:

- `GET /org/people`
- `GET /projects`
- `GET /projects/{id}`
- `GET /assignments`
- `GET /dashboard/employee/{id}`
- `GET /dashboard/project-manager/{id}`
- `GET /dashboard/hr-manager/{id}`
- `GET /dashboard/resource-manager/{id}`
- `GET /dashboard/workload/summary`
- `GET /dashboard/workload/planned-vs-actual`
- `GET /exceptions`
- `GET /teams/{id}/dashboard`

## Read-Path Optimizations In Place

The current pack already benefits from several query-shaping improvements:

- employee directory filtering and pagination now happen in the database
- manager-scope reads no longer materialize the full directory just to find a manager subtree
- assignments list filtering now uses repository-side query predicates instead of `findAll()` plus in-memory filtering
- project registry list no longer performs per-project external-link lookups during summary rendering
- team member and team dashboard reads benefit from the optimized directory/resource-pool filtering path

These changes preserve response contracts while reducing avoidable full-scan and N+1 behavior.

## Threshold Philosophy

The included thresholds are local smoke targets, not production SLOs.

They are intentionally practical:

- meant to catch obvious regressions
- loose enough for Docker-on-laptop variance
- only enforced when `PERF_ENFORCE_THRESHOLDS=true`

Current default thresholds:

- people/project detail queries: around `1.0s` to `1.5s`
- filtered assignment and dashboard reads: around `2.0s` to `2.5s`

If a threshold needs to move, update the script and document why. Do not silently normalize slower behavior.

## Important Limitations

Some dashboard services are still partly demo-backed rather than fully database-backed:

- workload summary
- parts of planned-vs-actual display mapping
- resource manager dashboard managed-team discovery
- parts of HR and PM display-name mapping

Because of that:

- those endpoints are still valuable smoke checks
- their timings are not pure large-dataset database benchmarks yet
- org, project, assignment, employee dashboard, team dashboard, and exception reads are the most representative current signals

## Recommended Use

Use this pack when we:

- change query logic
- change repository mappings
- add indexes
- change dashboard aggregation logic
- prepare a release candidate for UAT
