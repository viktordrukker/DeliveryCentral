# Exceptions API

## Endpoints

### `GET /exceptions`

Returns the current derived exception queue.

Supported query parameters:

- `asOf`
- `category`
- `status`
- `provider`
- `targetEntityType`
- `targetEntityId`
- `limit`

Response shape:

- `asOf`
- `items[]`
- `summary`

Each item includes at minimum:

- `id`
- `category`
- `status`
- `sourceContext`
- `summary`
- `observedAt`
- `targetEntityType`
- `targetEntityId`

Optional fields appear when relevant:

- `projectId`
- `projectName`
- `personId`
- `personDisplayName`
- `assignmentId`
- `workEvidenceId`
- `provider`
- `details`

### `GET /exceptions/{id}`

Returns one current exception item by id.

If the anomaly is no longer derivable from current truths, the item is not
returned and the endpoint responds with `404`.

## Categories

- `WORK_EVIDENCE_WITHOUT_ASSIGNMENT`
- `ASSIGNMENT_WITHOUT_EVIDENCE`
- `WORK_EVIDENCE_AFTER_ASSIGNMENT_END`
- `PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS`
- `STALE_ASSIGNMENT_APPROVAL`
- `M365_RECONCILIATION_ANOMALY`
- `RADIUS_RECONCILIATION_ANOMALY`

## Statuses

- `OPEN`

## Notes

- This API is operational and read-only.
- It is distinct from business audit browsing.
- It does not expose secrets or raw integration payloads.
