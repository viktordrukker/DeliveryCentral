# Operator Drills

## Purpose

This pack gives operators and delivery leads a safe, repeatable way to rehearse common platform degradation and incident scenarios in Docker-based local or staging environments.

It is not destructive chaos engineering. Each drill is either:

- observation-only
- exercised through an existing focused automated spec
- paired with a reversible Docker action

Use it together with:

- [production-readiness.md](C:\VDISK1\DeliveryCentral\docs\deployment\production-readiness.md)
- [release-readiness-checklist.md](C:\VDISK1\DeliveryCentral\docs\testing\release-readiness-checklist.md)
- [observability-integration.md](C:\VDISK1\DeliveryCentral\docs\infra\observability-integration.md)

## Prerequisites

- Docker stack is running
- backend is healthy
- frontend is reachable
- operator has an admin-capable token or uses the backend container self-signed local token path

Recommended baseline before each drill:

```powershell
docker compose exec -T backend npm run platform:self-check
```

## Drill Helper

A read-first drill helper is available inside the backend container:

```powershell
docker compose exec -T backend npm run platform:operator-drills
```

Run a single drill snapshot:

```powershell
docker compose exec -T backend npm run platform:operator-drills -- --drill integration-sync-failure
```

Run a drill plus its focused backend exercise:

```powershell
docker compose exec -T backend npm run platform:operator-drills -- --drill notification-degradation --exercise
```

Supported drill names:

- `integration-sync-failure`
- `notification-degradation`
- `database-visibility`
- `assignment-conflict`
- `project-closure-override`
- `exception-queue-review`

## Drill 1: Integration Sync Failure

### Goal

Confirm operators can see degraded integration behavior without using raw container logs.

### Safe exercise path

```powershell
docker compose exec -T backend npm run platform:operator-drills -- --drill integration-sync-failure --exercise
```

This reuses the existing negative integration suite and then snapshots:

- `/api/diagnostics`
- `/api/integrations/history`
- `/api/integrations/m365/directory/reconciliation`
- `/api/integrations/radius/reconciliation`
- `/api/exceptions?limit=10`

### UI review

Open:

- `/admin/integrations`
- `/exceptions`
- `/admin/monitoring`

### Expected results

- integration history is visible
- degraded runs show bounded failure summaries
- reconciliation review remains visible for M365 or RADIUS when relevant
- internal org/person truth is not overwritten

### Recovery

No manual cleanup is required. The focused spec is read-safe from an operator perspective and leaves normal runtime intact.

## Drill 2: Notification Delivery Degradation

### Goal

Confirm retrying and failed notification outcomes are visible to operators.

### Safe exercise path

```powershell
docker compose exec -T backend npm run platform:operator-drills -- --drill notification-degradation --exercise
```

This reuses the focused notifications suite and then snapshots:

- `/api/diagnostics`
- `/api/notifications/outcomes`
- `/api/audit/business?limit=10`

### UI review

Open:

- `/admin/notifications`
- `/admin/monitoring`
- `/admin/audit`

### Expected results

- recent notification outcomes show `SUCCEEDED`, `RETRYING`, or terminal failure states when applicable
- diagnostics summarize notification readiness without exposing secrets
- business audit remains business-oriented rather than raw transport logging

### Recovery

No manual cleanup is required.

## Drill 3: Database Connectivity Visibility

### Goal

Verify that operators can distinguish a database reachability problem from a generic platform outage.

### Observation-first path

Run a baseline snapshot:

```powershell
docker compose exec -T backend npm run platform:operator-drills -- --drill database-visibility
```

### Optional reversible fault simulation

Stop PostgreSQL briefly:

```powershell
docker compose stop postgres
```

Then inspect:

- `/api/health`
- `/api/readiness`
- `/api/diagnostics`
- `/admin/monitoring`

After observation, restore the DB:

```powershell
docker compose start postgres
```

Wait for health recovery, then rerun:

```powershell
docker compose exec -T backend npm run platform:self-check
```

### Expected results

- readiness degrades clearly
- diagnostics show database connectivity problems separately from migration sanity
- monitoring UI shows degraded database state without leaking connection secrets

### Recovery expectation

After PostgreSQL is restarted, health and readiness should return to normal without rebuilding containers.

## Drill 4: Stale Approval and Concurrency Conflict Handling

### Goal

Confirm conflicting assignment lifecycle mutations fail safely and visibly.

### Safe exercise path

```powershell
docker compose exec -T backend npm run platform:operator-drills -- --drill assignment-conflict --exercise
```

This reuses the concurrency-aware assignment lifecycle specs and snapshots:

- `/api/assignments?status=APPROVED`
- `/api/exceptions?limit=10`
- `/api/audit/business?limit=10`

### UI review

Open:

- `/assignments`
- `/exceptions`
- `/admin/audit`

### Expected results

- stale approval or end attempts are rejected rather than silently overwritten
- history remains visible in assignment detail views
- operators can trace conflicts through business-readable responses and audit records

## Drill 5: Project Closure Conflict and Override Visibility

### Goal

Verify that project closure conflicts are blocked by default and explicit override remains auditable.

### Safe exercise path

```powershell
docker compose exec -T backend npm run platform:operator-drills -- --drill project-closure-override --exercise
```

This reuses the focused project closure spec and snapshots:

- `/api/projects`
- `/api/exceptions?limit=10`
- `/api/audit/business?limit=10`

### UI review

Open:

- `/projects`
- `/exceptions`
- `/admin/audit`

### Expected results

- normal close is blocked when active assignments exist
- override path requires explicit reason capture
- override behavior is visible through audit and exception surfaces

## Drill 6: Exception Queue Review

### Goal

Ensure operators can use the exception queue as the main triage surface for staffing and project anomalies.

### Safe exercise path

```powershell
docker compose exec -T backend npm run platform:operator-drills -- --drill exception-queue-review --exercise
```

This reuses the focused exception queue spec and snapshots:

- `/api/exceptions?limit=10`
- `/api/audit/business?limit=10`

### UI review

Open:

- `/exceptions`
- `/admin/audit`
- `/admin/monitoring`

### Expected results

- exception categories are readable
- detail context is visible
- operators can navigate from queue review into related staffing or project surfaces

## Recording Results

For each drill, record:

- date and environment
- drill name
- who ran it
- command used
- observed status
- screenshots or copied JSON summary where useful
- follow-up issues raised

## Recommended Drill Cadence

- before UAT kickoff: drills 1 through 6
- before controlled rollout: drills 1 through 5 plus full production self-check
- after major auth, persistence, notifications, or integration changes: rerun the relevant drill subset

## Pass Criteria

A drill is considered successful when:

- the scenario is reproducible
- operators can see the degraded condition through platform surfaces
- secrets are not exposed
- expected recovery or stable degraded behavior is understood
- any required override path remains explicit and auditable
