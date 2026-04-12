# UAT Happy Path: Staffing Operations

## Purpose

This pack validates one realistic staffing happy path through the live platform using deterministic data and real API flows.

It is intended to answer a simple operational question:

Can the platform support the core enterprise staffing journey from employee onboarding readiness through assignment completion, evidence capture, notification recording, and business audit visibility?

## Covered Flow

The automated and manual pack covers this sequence:

1. create employee
2. assign a solid-line manager with effective dating
3. create project
4. activate project
5. create assignment
6. approve assignment
7. verify assignment visibility in employee and manager-facing reads
8. record manual work evidence
9. end assignment
10. verify notification outcomes were recorded
11. verify business audit records were produced

## Deterministic Scenario Data

Fixture:
- [uat-happy-path-staffing.fixture.ts](C:\VDISK1\DeliveryCentral\test\scenarios\uat-happy-path-staffing\uat-happy-path-staffing.fixture.ts)

Core seeded actors reused from the demo organization dataset:
- `Emma Garcia` (`11111111-1111-1111-1111-111111111005`) for admin and HR-scoped checks
- `Sophia Kim` (`11111111-1111-1111-1111-111111111006`) as the future line manager and project manager
- `Liam Patel` (`11111111-1111-1111-1111-111111111004`) as the resource manager / assignment requester

Deterministic created records:
- employee email: `uat.staffing.employee@example.com`
- project name: `UAT Staffing Scenario Project`
- evidence source record key: `UAT-STAFFING-EVIDENCE-001`

Deterministic dates:
- reporting line start: `2025-06-16T00:00:00.000Z`
- project start: `2025-06-15T00:00:00.000Z`
- assignment start: `2025-07-01T00:00:00.000Z`
- evidence recorded at: `2025-07-15T00:00:00.000Z`
- assignment end: `2025-07-31T00:00:00.000Z`
- dashboard validation as-of during assignment: `2025-07-15T00:00:00.000Z`
- dashboard validation as-of after assignment end: `2025-08-02T00:00:00.000Z`

## Automated Coverage

Reusable scenario runner:
- [run-uat-happy-path-staffing.ts](C:\VDISK1\DeliveryCentral\test\helpers\scenarios\run-uat-happy-path-staffing.ts)

Automated specs:
- [uat-happy-path-staffing.integration.spec.ts](C:\VDISK1\DeliveryCentral\test\integration\api\uat-happy-path-staffing.integration.spec.ts)
- [uat-happy-path-staffing.e2e-spec.ts](C:\VDISK1\DeliveryCentral\test\e2e\uat-happy-path-staffing.e2e-spec.ts)

The automated pack asserts:
- employee creation succeeds with durable org runtime data
- reporting-line assignment is visible in person reads
- project lifecycle reaches `ACTIVE`
- assignment lifecycle reaches `REQUESTED`, `APPROVED`, then `ENDED`
- employee dashboard shows the assignment during the staffed period
- manager scope shows the employee after reporting-line setup
- work evidence is recorded without mutating assignment truth
- assignment history contains requested, approved, and ended events
- notification outcomes exist for workflow events that currently emit notifications
- business audit records exist for the main lifecycle actions

## Notification Scope In This UAT Pack

The current platform records workflow notification outcomes for events such as:
- `project.activated`
- `assignment.created`
- `assignment.approved`

The automated UAT pack validates that those outcomes are recorded and queryable.

Current limitation:
- notification routing is still based on configured operational recipients, not personalized employee/resource-manager recipients
- assignment end does not currently emit a notification event

Because of that, this pack validates notification recording and operator visibility, not person-specific recipient delivery.

## Docker-Only Execution

Backend integration scenario:

```bash
docker compose run --rm --no-deps backend npm test -- --runInBand test/integration/api/uat-happy-path-staffing.integration.spec.ts
```

Backend e2e scenario:

```bash
docker compose run --rm --no-deps backend npm test -- --runInBand test/e2e/uat-happy-path-staffing.e2e-spec.ts
```

Run both together:

```bash
docker compose run --rm --no-deps backend npm test -- --runInBand test/integration/api/uat-happy-path-staffing.integration.spec.ts test/e2e/uat-happy-path-staffing.e2e-spec.ts
```

Run these serially.

Reason:
- both specs reset and reseed the shared local test database
- parallel execution can cause deterministic seed collisions in the current Docker test model

## Expected Results

Successful scenario execution should leave these outcomes visible during the app lifetime of the test run:
- created employee with current line manager set to `Sophia Kim`
- active project with the created employee assigned during July 2025
- employee dashboard showing one active assignment on `2025-07-15`
- employee dashboard showing zero active assignments on `2025-08-02`
- one manual work-evidence record for the created employee/project pair
- assignment history containing:
  - `ASSIGNMENT_REQUESTED`
  - `ASSIGNMENT_APPROVED`
  - `ASSIGNMENT_ENDED`
- notification outcomes containing successful workflow sends for:
  - `project.activated`
  - `assignment.created`
  - `assignment.approved`
- business audit containing:
  - `employee.created`
  - `reporting_line.changed`
  - `project.created`
  - `project.activated`
  - `assignment.created`
  - `assignment.approved`
  - `assignment.ended`
  - `notification.send_result`

## Relationship To Browser E2E

This pack is intentionally API-driven.

Reason:
- the scenario is meant to validate the operational backend truth across multiple bounded contexts
- this gives deterministic coverage for auth-protected, audit-sensitive flows without brittle browser setup
- existing Playwright coverage still validates a narrower visible workload path in the UI

Use this pack for UAT-grade operational validation. Use Playwright for focused user-visible path checks.
