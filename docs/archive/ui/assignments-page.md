# Assignments Page

## Purpose
The Assignments page is the first operational staffing overview in the frontend. It surfaces authoritative internal `ProjectAssignment` records from `GET /assignments` and keeps work evidence and external integration data out of the core staffing table.

## Route
- `/assignments`
- row navigation: `/assignments/:id`

## Data contract
The page consumes the assignment query API and renders:
- person summary
- project summary
- staffing role
- allocation percent
- date range
- approval state

## Filters
Current filters are intentionally simple and configuration-safe:
- person: free-text client-side filter against person display name
- project: free-text client-side filter against project display name
- approval state: API-backed text filter passed through to `GET /assignments?status=...`

No approval-state dictionary is hardcoded into the client. If metadata-driven state definitions are exposed later, this page should swap the free-text field for a metadata-backed control.

## Interaction model
- loading, empty, and error states are explicit
- row click navigates to an assignment details placeholder route
- no client-side mutation logic exists on this page

## Boundary notes
- assignment rows are authoritative staffing data
- Jira or other evidence sources do not appear as assignment identity on this page
- business workflow logic remains in backend/application services, not in table cells
