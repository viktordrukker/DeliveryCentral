# Business Audit UI

## Purpose

The Business Audit page gives operators a business-action investigation surface at:

- `/admin/audit`

It is intentionally different from monitoring or technical logs. The page focuses on
meaningful business actions such as employee lifecycle changes, assignment workflow
transitions, project lifecycle events, and integration or notification summaries.

## Data Source

The page uses:

- `GET /audit/business`

Backend-supported query filters:

- `actorId`
- `actionType`
- `targetEntityType`
- `targetEntityId`
- `limit`

Additional time-range filtering is applied in the frontend after retrieval because the
current backend contract does not expose date-range query parameters.

## Route Behavior

The page is part of the admin surface and includes:

- authentication token helper for protected access
- investigation filters
- a readable business-audit table
- clear copy distinguishing business audit from technical monitoring

## UI Capabilities

### Browse records

Records render in a business-oriented table with:

- occurred timestamp
- action type
- target entity type and id
- actor
- change summary
- concise metadata summary

### Filter and search

Operators can filter by:

- entity type
- entity id
- actor
- action type
- time range
- result limit

### Operational readability

The page intentionally avoids:

- raw transport log formatting
- technical request-level detail
- full metadata dumps
- secret exposure

Instead it keeps the records readable for governance and investigation work.

## State Handling

The page supports:

- loading state
- empty results state
- API error state
- resettable filters

## Tests

Coverage lives in:

- `frontend/src/routes/admin/BusinessAuditPage.test.tsx`

The tests verify:

- records render
- loading and error behavior
- filter interactions
- backend-aligned query submission
