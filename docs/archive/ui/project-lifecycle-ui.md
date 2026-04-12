# Project Lifecycle UI

## Purpose

The project lifecycle UI turns the frontend project surface into an operational control flow for:

- creating internal projects
- activating draft projects
- closing active projects
- assigning teams to projects

The internal project remains the primary business object. External links remain secondary context.

## Routes

- `/projects`
- `/projects/new`
- `/projects/{id}`

## Data Sources

The UI uses existing backend APIs without introducing frontend-only lifecycle logic:

- `GET /projects`
- `POST /projects`
- `GET /projects/{id}`
- `POST /projects/{id}/activate`
- `POST /projects/{id}/close`
- `POST /projects/{id}/assign-team`
- `GET /teams`
- `GET /org/people`

## Implemented Flows

### Create project

- available from the project registry
- captures:
  - name
  - description
  - start date
  - planned end date
  - project manager
- projects are created as `DRAFT`

### Activate project

- available from project details when the project is `DRAFT`
- updates the live project state without changing project identity

### Close project

- available from project details when the project is `ACTIVE`
- preserves project history
- displays the returned workspend summary:
  - total mandays
  - by role
  - by skillset

### Assign team to project

- available from project details
- uses real team data from the Teams API
- translates the selected team to the team org-unit mapping required by the backend contract
- shows explicit created and skipped duplicate results so staffing traceability stays visible

## Auth Handling

Protected lifecycle actions use the locally stored bearer token through the shared frontend API client.
The UI surfaces the existing token field where protected actions are performed. No secrets are displayed back to the user.

## Validation and State Handling

- loading states for managers and teams
- field validation for create and assign-team flows
- success banners for lifecycle actions
- explicit error display for backend failures
- close flow requires confirmation before submission

## Tests

Coverage lives in:

- `frontend/src/routes/projects/CreateProjectPage.test.tsx`
- `frontend/src/routes/projects/ProjectDetailsPage.test.tsx`
- `frontend/src/routes/projects/ProjectsPage.test.tsx`

Covered behaviors:

- create project flow
- activate project action
- close project flow
- assign-team action
- assign-team validation
