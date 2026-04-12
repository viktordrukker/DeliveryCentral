# Cases UI

## Purpose

The Cases UI turns the governance/case-management slice into a usable operational surface instead of a placeholder. It keeps Case workflow distinct from Assignment workflow while giving teams a simple way to open, browse, and review governance records.

## Routes

- `/cases`
  - list and filter cases
- `/cases/new`
  - create a new case
- `/cases/:id`
  - inspect case details and linked context

## Backend APIs used

- `GET /cases`
- `POST /cases`
- `GET /cases/{id}`

The current backend contract supports an onboarding-oriented case type. The UI reflects that real backend capability rather than inventing broader BPM behavior.

## List view

The cases list provides:

- case number and type
- status
- subject person id
- owner person id
- summary
- opened date
- navigation into case detail

Available filters align to the backend query contract:

- case type
- owner person id
- subject person id

## Create flow

The create page is intentionally minimal and operational.

Inputs:

- subject person
- owner
- optional related project
- optional related assignment
- summary

Data sources are live:

- people from `GET /org/people`
- projects from `GET /projects`
- assignments from `GET /assignments`

Validation currently enforces:

- subject person is required
- owner is required

On success, the page shows the created case number and a direct link into case detail.

## Detail view

The case detail page shows:

- case summary
- linked project and assignment context
- participants
- subject and owner links back into people details

This keeps the case surface operational without overbuilding workflow orchestration.

## Design notes

- Cases remain distinct from assignments.
- Related project/assignment references are contextual links, not ownership of those workflows.
- The UI is intentionally simple so the platform can extend later into onboarding, offboarding, staffing exceptions, or governance follow-up cases without reworking the basic route structure.

## Tests

Focused frontend coverage lives in:

- `frontend/src/routes/cases/CasesPage.test.tsx`
- `frontend/src/routes/cases/CreateCasePage.test.tsx`
- `frontend/src/routes/cases/CaseDetailsPage.test.tsx`

Covered behaviors:

- list renders
- filters flow through the backend-aligned query contract
- create flow submits real API payloads
- validation errors are visible
- detail renders linked context
- not-found state renders clearly
