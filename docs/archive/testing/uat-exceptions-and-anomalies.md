# UAT Exceptions And Anomalies

## Purpose

This pack validates the most important staffing and project exception paths that operators must understand before using the platform in real enterprise operations.

The goal is not only to see errors. The goal is to prove that anomalies stay visible, explainable, and bounded to the correct source of truth.

## Covered Scenarios

The current anomaly UAT pack covers:

1. inactive employee but assignment requested
2. project closed while active assignments remain
3. work evidence exists without assignment
4. assignment exists without work evidence
5. future-dated reporting change affects manager visibility
6. bulk assignment partial failure
7. degraded M365 sync does not corrupt internal org truth

## Deterministic Fixture

Fixture:
- [uat-staffing-anomalies.fixture.ts](C:\VDISK1\DeliveryCentral\test\scenarios\uat-staffing-anomalies\uat-staffing-anomalies.fixture.ts)

Runner:
- [run-uat-staffing-anomalies.ts](C:\VDISK1\DeliveryCentral\test\helpers\scenarios\run-uat-staffing-anomalies.ts)

## Automated Coverage

Automated specs:
- [uat-exceptions-and-anomalies.integration.spec.ts](C:\VDISK1\DeliveryCentral\test\integration\api\uat-exceptions-and-anomalies.integration.spec.ts)
- [uat-exceptions-and-anomalies.e2e-spec.ts](C:\VDISK1\DeliveryCentral\test\e2e\uat-exceptions-and-anomalies.e2e-spec.ts)

The automated pack verifies:
- invalid assignment request for an inactive employee fails safely
- planned-vs-actual surfaces both staffing gaps and shadow-work conditions
- future-dated reporting change shifts manager scope at the correct effective date
- bulk assignment returns explicit partial-success output
- project closure can be followed by a closure conflict exception when active assignments remain
- exception queue exposes the derived anomaly items
- failed M365 sync leaves internal people data unchanged
- failed M365 sync appears in integration sync history as `FAILED`

## Docker Commands

Run the integration scenario:

```bash
docker compose exec -T backend npm test -- --runInBand test/integration/api/uat-exceptions-and-anomalies.integration.spec.ts
```

Run the app-level E2E scenario:

```bash
docker compose run --rm --no-deps backend npm test -- --runInBand test/e2e/uat-exceptions-and-anomalies.e2e-spec.ts
```

Run these serially because both specs reset the shared local test database.

## Manual UAT Checklist

### 1. Inactive Employee Exclusion

- create or locate an inactive employee
- attempt to request an assignment
- expect a clear failure

Expected result:
- assignment is not created
- internal staffing truth is unchanged
- error is readable and non-destructive

### 2. Assignment Without Evidence

- create and approve an assignment
- do not add work evidence
- open planned-vs-actual or exception views

Expected result:
- staffing record remains authoritative
- gap is visible as an anomaly

### 3. Evidence Without Assignment

- record manual work evidence for a person/project pair without approved staffing
- open planned-vs-actual or exception views

Expected result:
- evidence remains visible with source traceability
- no assignment is auto-created

### 4. Future-Dated Reporting Change

- assign a future-dated solid-line manager change
- check previous manager scope before effective date
- check previous and new manager scope after effective date

Expected result:
- current scope remains stable before cutover
- visibility changes only after the effective date

### 5. Bulk Partial Failure

- submit a bulk request with one valid employee and one invalid or inactive employee

Expected result:
- valid item is created
- failed item is returned explicitly
- failure is not hidden behind rollback or generic error text

### 6. Project Closure Conflict

- close a project while approved active assignments still exist
- open the exception queue

Expected result:
- project may close according to current lifecycle behavior
- closure conflict appears as an explicit exception item
- history and staffing records remain intact

### 7. Integration Degradation Boundary

- trigger a failing M365 sync in a controlled environment
- compare internal people records before and after
- open integration sync history

Expected result:
- internal org truth is unchanged
- failure is visible in integration history
- no silent overwrite or deletion occurs

## Source-Of-Truth Guardrails

This pack intentionally validates the following boundaries:
- assignment remains internal staffing truth
- work evidence remains observational truth
- reporting lines remain effective-dated org truth
- external integrations remain read-only or anti-corruption inputs
- exceptions are derived operational objects, not silent side effects

## Relationship To Other Test Packs

Related documents:
- [uat-happy-path-staffing.md](C:\VDISK1\DeliveryCentral\docs\testing\uat-happy-path-staffing.md)
- [scenario-planned-vs-actual.md](C:\VDISK1\DeliveryCentral\docs\testing\scenario-planned-vs-actual.md)
- [negative-path-tests.md](C:\VDISK1\DeliveryCentral\docs\testing\negative-path-tests.md)

Use the happy-path pack to confirm normal staffing operations work.
Use this anomaly pack to confirm the platform behaves responsibly when operations become messy.
