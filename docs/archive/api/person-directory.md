# Person Directory API

## Purpose

Read-only directory API for workload planning and org visibility.

Managers and planners use this slice to browse people before creating assignments.

## Endpoints

### `GET /org/people`

Returns a paginated person directory view with:

- current org unit
- current line manager
- dotted-line manager summary
- current assignment count summary
- resource pool memberships

Supported query parameters:

- `page`
- `pageSize`
- `departmentId`
- `resourcePoolId`

### `GET /org/people/{id}`

Returns a single person directory record by id.

## Notes

- this is a read-only slice
- no write logic is mixed into this API
- persistence shape is not exposed directly
- the initial implementation reads from the deterministic demo dataset through a query repository abstraction
