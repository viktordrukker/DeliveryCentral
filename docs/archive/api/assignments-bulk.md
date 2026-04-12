# Bulk Assignments API

## Endpoint

### `POST /assignments/bulk`

Creates multiple internal assignment requests in a single call.

## Strategy

This endpoint uses `PARTIAL_SUCCESS`.

Valid items are created immediately. Invalid items are returned in the same
response with explicit failure details.

## Request body

- `actorId`
- `entries[]`
  - `projectId`
  - `personId`
  - `staffingRole`
  - `allocationPercent`
  - `startDate`
  - `endDate` optional
  - `note` optional

## Response body

- `strategy`
- `totalCount`
- `createdCount`
- `failedCount`
- `createdItems[]`
  - `index`
  - `assignment`
- `failedItems[]`
  - `index`
  - `personId`
  - `projectId`
  - `staffingRole`
  - `code`
  - `message`

## Common failure codes

- `PERSON_NOT_FOUND`
- `PROJECT_NOT_FOUND`
- `PERSON_INACTIVE`
- `ASSIGNMENT_CONFLICT`
- `VALIDATION_ERROR`
- `ASSIGNMENT_CREATION_FAILED`

## Notes

- every successful item is still a normal `ProjectAssignment`
- domain validation is not bypassed for bulk operations
- duplicate/conflicting items are reported explicitly, not silently dropped
