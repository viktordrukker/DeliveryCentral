# Create Assignment Form

## Purpose
The Create Assignment form is the first visible staffing command in the UI. It submits authoritative internal `ProjectAssignment` requests to `POST /assignments` and keeps staffing creation separate from Jira and work-evidence inputs.

## Route
- `/assignments/new`

## Data dependencies
The form loads selector options from existing read APIs:
- `GET /org/people` for requester and person selectors
- `GET /projects` for project selector
- `POST /assignments` for submission

No people or projects are hardcoded in the client.

## Fields
- requested by
- person
- project
- staffing role
- allocation percent
- start date
- end date
- note

`requested by` is explicit until authenticated actor context is available in the frontend shell.

## Validation model
Inline validation is handled client-side for:
- required fields
- allocation percent range
- end date before start date

Server validation remains authoritative. API errors are rendered in-page so backend constraint messages remain visible to the user.

## UX behavior
- loads option lists before rendering the form
- shows inline field errors
- shows submit state while posting
- shows success banner after a successful create
- shows server error banner when the command fails
- keeps form logic outside presentational inputs so the component can be reused in future edit/request flows

## Boundary notes
- the form creates person-to-project assignments only
- it does not derive assignments from Jira or work evidence
- selector values come from platform APIs, not UI-owned business dictionaries
