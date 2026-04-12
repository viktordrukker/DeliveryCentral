# Project Details

## Purpose

The Project Details page is the operational project record in the frontend. It keeps the internal project as the primary object, presents external links as attached integration context, and exposes lifecycle controls directly on the project.

## Data Source

The page uses:

- `GET /projects/{id}`
- `POST /projects/{id}/activate`
- `POST /projects/{id}/close`
- `POST /projects/{id}/close-override`
- `POST /projects/{id}/assign-team`
- `GET /teams`

No project identity is derived from Jira or other external systems in the UI.

## Implemented Layout

- summary cards across the top
- project summary section
- external links section
- lifecycle controls section
- assign-team section
- operational views section with dashboard handoff

## State Handling

- loading state while the project record is fetched
- not-found state when the backend returns `404`
- error state for non-`404` failures
- action success/error feedback for lifecycle operations

## Display Rules

- internal project name, code, and status lead the page
- external links are grouped in their own section
- lifecycle controls are action-driven, not placeholder-framed
- project closure override is not shown by default; it appears only after a real blocking close conflict for director/admin tokens
- assign-team results show created and skipped duplicate items explicitly
- project closure shows returned workspend buckets instead of hiding closure output
