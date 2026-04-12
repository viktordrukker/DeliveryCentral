# Work Evidence API

## Purpose

This slice records observed work independently from formal staffing assignments.

`WorkEvidence` is operational evidence. It does not create, approve, reject, or mutate `ProjectAssignment`.

The live runtime now stores work evidence durably in PostgreSQL through Prisma-backed persistence.

## Endpoints

### `POST /work-evidence`

Creates a manual or internal work evidence record.

Request body:

```json
{
  "personId": "11111111-1111-1111-1111-111111111012",
  "projectId": "33333333-3333-3333-3333-333333333002",
  "sourceType": "MANUAL",
  "sourceRecordKey": "MANUAL-001",
  "recordedAt": "2025-03-20T12:00:00.000Z",
  "effortHours": 4,
  "summary": "Manual effort entry",
  "details": {
    "activity": "timesheet"
  },
  "trace": {
    "correlationId": "corr-1"
  }
}
```

Rules:

- `sourceType` is explicit and extensible.
- `effortHours` must be greater than zero.
- `recordedAt` must be a valid ISO timestamp.
- `sourceRecordKey` is required for traceability.
- `personId` and `projectId` are optional in the evidence model, so unassigned or unattributed evidence can still be captured.
- evidence creation persists a durable `WorkEvidenceSource` identity alongside the evidence record so source lineage remains explicit.

### `GET /work-evidence`

Lists work evidence with optional filters:

- `personId`
- `projectId`
- `sourceType`
- `dateFrom`
- `dateTo`

Example:

```text
GET /work-evidence?personId=11111111-1111-1111-1111-111111111012&sourceType=MANUAL
```

## Boundary Notes

- This API is read/write for evidence only.
- It does not call assignment command services.
- Jira-specific worklog ingestion belongs behind the integrations adapter layer and is not part of this manual slice.
- Persisted evidence does not mutate assignment lifecycle state.
