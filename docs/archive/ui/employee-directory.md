# Employee Directory

## Purpose

The Employee Directory is the first usable business page in the frontend. It gives planners and managers a readable list of people before staffing workflows are created or reviewed.

## Data Source

The page uses the existing backend endpoint:

- `GET /org/people`

No people data is hardcoded in the UI.

## Implemented UI

- route-backed employee directory page
- page header and filter/search bar
- reusable table wrapper for people rows
- loading state
- empty state
- error state
- row click navigation to an employee details placeholder route
- pagination controls aligned to backend pagination

## Displayed Columns

- person name
- org unit
- line manager
- dotted-line summary
- active assignment count

## Boundaries

- business logic stays in the data hook and API module
- table cells render values only
- filters map to backend query parameters where supported
- free-text search is applied client-side to the current result set until a backend search contract exists
