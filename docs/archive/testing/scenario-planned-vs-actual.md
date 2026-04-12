# Planned Vs Actual Scenario

## Purpose

This scenario document explains how to validate the main planned-vs-actual comparison categories using deterministic staffing and work-evidence conditions.

It is intended for business validation, not only developer debugging.

## Categories To Validate

The platform currently exposes these main comparison outputs:
- `assignedButNoEvidence`
- `evidenceButNoApprovedAssignment`
- `matchedRecords`
- `anomalies`

These categories must remain explicit because assignment is internal staffing truth and work evidence is observational truth.

## UAT Scenario Alignment

The anomaly UAT pack exercises two critical categories directly:

1. approved assignment with no work evidence
2. work evidence recorded without an approved assignment

Fixture:
- [uat-staffing-anomalies.fixture.ts](C:\VDISK1\DeliveryCentral\test\scenarios\uat-staffing-anomalies\uat-staffing-anomalies.fixture.ts)

Runner:
- [run-uat-staffing-anomalies.ts](C:\VDISK1\DeliveryCentral\test\helpers\scenarios\run-uat-staffing-anomalies.ts)

## Expected Business Meaning

### Assignment Without Evidence

Interpretation:
- a person is formally staffed
- no observational work evidence exists for the staffed period

Validation expectation:
- the assignment remains valid staffing truth
- the absence of evidence is surfaced as an operational gap, not silently corrected

### Evidence Without Assignment

Interpretation:
- work has been observed
- no approved staffing record exists for the same person/project/time context

Validation expectation:
- the evidence remains traceable to its source
- the platform does not auto-create or mutate an assignment to remove the discrepancy

## API Surface

Endpoint:
- `GET /dashboard/workload/planned-vs-actual`

Useful query parameters:
- `asOf`
- `projectId`
- `personId`

## Manual Validation Sequence

1. create or identify an approved assignment without adding evidence
2. add work evidence for a different person or same project without an approved assignment
3. open planned-vs-actual
4. verify both categories are visible and separated
5. confirm matched records remain separate from anomalies

## Automated Validation

The anomaly UAT pack asserts that planned-vs-actual returns:
- the created approved assignment in `assignedButNoEvidence`
- the manual evidence record in `evidenceButNoApprovedAssignment`

Files:
- [uat-exceptions-and-anomalies.integration.spec.ts](C:\VDISK1\DeliveryCentral\test\integration\api\uat-exceptions-and-anomalies.integration.spec.ts)
- [uat-exceptions-and-anomalies.e2e-spec.ts](C:\VDISK1\DeliveryCentral\test\e2e\uat-exceptions-and-anomalies.e2e-spec.ts)

## Business Guardrail

The point of this scenario is not to make the system look clean.

The point is to prove that the platform exposes staffing and evidence mismatches clearly enough for operational review, exception handling, and follow-up actions.
