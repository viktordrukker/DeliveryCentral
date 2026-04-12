# Project Registry

## Purpose

The Project Registry page makes internal projects visible as first-class business objects before staffing and integration workflows are layered on top.

## Data Source

The page uses:

- `GET /projects`

Optional source filtering is passed through to the backend with the `source` query parameter.

## Display Rules

- internal `Project` remains the primary row identity
- external links are shown only as a secondary summary
- provider link counts are displayed without turning provider keys into project identity

## Implemented UI

- project registry route
- searchable project table
- linked external system filter input
- loading state
- empty state
- error state
- row click navigation to a project details placeholder route

## Columns

- project name
- project code
- status
- external links summary
- assignment count
