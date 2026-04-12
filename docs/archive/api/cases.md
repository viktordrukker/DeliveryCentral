# Cases API

## Purpose

This slice provides the first case-management API for onboarding flows linked to people and optional staffing context.

## Endpoints

### `POST /cases`

Creates an onboarding case.

Request body:

```json
{
  "caseTypeKey": "ONBOARDING",
  "subjectPersonId": "11111111-1111-1111-1111-111111111012",
  "ownerPersonId": "11111111-1111-1111-1111-111111111006",
  "relatedProjectId": "33333333-3333-3333-3333-333333333003",
  "relatedAssignmentId": "36666666-0000-0000-0000-000000000001",
  "summary": "Prepare onboarding for project delivery.",
  "participants": [
    {
      "personId": "11111111-1111-1111-1111-111111111006",
      "role": "OPERATOR"
    }
  ]
}
```

Rules:

- only `ONBOARDING` is supported in this initial slice
- `subjectPersonId` must exist
- `ownerPersonId` must exist
- `relatedProjectId` and `relatedAssignmentId` are optional, but must exist when provided

### `GET /cases`

Lists cases.

Optional filters:

- `caseTypeKey`
- `ownerPersonId`
- `subjectPersonId`

### `GET /cases/{id}`

Retrieves a single case by internal case id.
