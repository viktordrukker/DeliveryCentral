# UAT Dashboards: Role-Based Operational Validation

## Purpose

This pack validates that the platform dashboards are operationally useful for the main role-based users, not just present in the router.

It answers a practical UAT question:

Can a Project Manager, Resource Manager, HR Manager, Team Delivery Manager, and Admin operator each see the metrics, anomalies, and scoped operational signals they need from the platform itself?

## Covered Roles

- Project Manager
- Resource Manager
- HR Manager
- Team Delivery Manager
- System Administrator / Admin operator

## Deterministic Scenario Inputs

Fixture:
- [uat-dashboards.fixture.ts](C:\VDISK1\DeliveryCentral\test\scenarios\uat-dashboards\uat-dashboards.fixture.ts)

This pack composes the existing deterministic scenario packs:
- [uat-happy-path-staffing.fixture.ts](C:\VDISK1\DeliveryCentral\test\scenarios\uat-happy-path-staffing\uat-happy-path-staffing.fixture.ts)
- [uat-staffing-anomalies.fixture.ts](C:\VDISK1\DeliveryCentral\test\scenarios\uat-staffing-anomalies\uat-staffing-anomalies.fixture.ts)

Scenario runner:
- [run-uat-dashboards.ts](C:\VDISK1\DeliveryCentral\test\helpers\scenarios\run-uat-dashboards.ts)

The composed scenario intentionally provides:
- one completed happy-path staffing flow
- one anomaly-rich staffing/project flow
- persisted notification outcomes
- persisted business audit records
- failed integration history
- open exception queue items

## Automated Coverage

Automated spec:
- [uat-dashboards.integration.spec.ts](C:\VDISK1\DeliveryCentral\test\integration\api\uat-dashboards.integration.spec.ts)

The automated pack validates:

### Project Manager

- owned project visibility includes the created UAT project
- staffing-gap visibility remains explicit
- evidence-anomaly visibility remains explicit

### Resource Manager

- managed-team summary is populated
- unassigned people are visible
- cross-project team spread is visible

### HR Manager

- headcount changes reflect the deterministic scenario-created employees
- employees without manager relationships remain visible
- org-level governance signals are not hidden behind staffing views

### Team Delivery Manager

- team summary remains team-scoped
- member count, active assignments, and project count are visible
- team anomaly summary remains visible

### Admin Operator

- diagnostics remain available
- recent notification outcomes are visible
- failed integration history is visible
- exception queue is queryable
- business audit records exist for the scenario actions

## Role Validation Anchors

Use these deterministic anchors when reading the automated assertions or performing manual UAT:

- PM snapshot as-of: `2025-07-15T00:00:00.000Z`
- RM snapshot as-of: `2025-03-15T00:00:00.000Z`
- HR validation snapshot as-of: `2025-08-01T00:00:00.000Z`
- Team snapshot as-of: `2025-03-15T00:00:00.000Z`

Expected role-specific records:

- PM:
  - `UAT Staffing Scenario Project`
  - staffing gap project id `33333333-3333-3333-3333-333333333004`
  - evidence anomaly project id `33333333-3333-3333-3333-333333333005`
- RM:
  - team `Engineering Pool`
  - unassigned seeded people include `Sophia Kim` and `Mason Singh`
- HR:
  - total headcount increases by `3`
  - missing-manager visibility includes `Uat Inactive Employee` and `Uat Active Employee`
- Team Delivery:
  - team `Engineering Pool`
  - member count `4`
  - active assignments `2`
  - project count `2`
  - open team exceptions `1`
- Admin:
  - notification outcomes include `assignment.created`, `assignment.approved`, and `project.activated`
  - integration history includes failed `m365`
  - exception queue includes:
    - `PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS`
    - `WORK_EVIDENCE_WITHOUT_ASSIGNMENT`
    - `ASSIGNMENT_WITHOUT_EVIDENCE`

## Docker Execution

Run the dashboard UAT integration pack:

```bash
docker compose run --rm --no-deps backend npm test -- --runInBand test/integration/api/uat-dashboards.integration.spec.ts
```

Run this serially with the other UAT packs because the spec resets and reseeds the shared test database.

## Manual Dashboard UAT Routes

Use these routes after seeding the demo data and recreating the scenario manually or by following the related UAT packs:

- PM dashboard: `/dashboard/project-manager`
- RM dashboard: `/dashboard/resource-manager`
- HR dashboard: `/dashboard/hr`
- Team dashboard: `/teams/26666666-0000-0000-0000-000000000001/dashboard`
- Admin monitoring: `/admin/monitoring`
- Admin notifications: `/admin/notifications`
- Admin integrations: `/admin/integrations`
- Exception queue: `/exceptions`
- Business audit: `/admin/audit`

## Relationship To Other Packs

Related packs:
- [uat-happy-path-staffing.md](C:\VDISK1\DeliveryCentral\docs\testing\uat-happy-path-staffing.md)
- [uat-exceptions-and-anomalies.md](C:\VDISK1\DeliveryCentral\docs\testing\uat-exceptions-and-anomalies.md)
- [manual-smoke-checklist.md](C:\VDISK1\DeliveryCentral\docs\testing\manual-smoke-checklist.md)

Use the happy-path and anomaly packs to create confidence in operational truth.
Use this dashboard pack to validate that the role-based views make that truth usable.
