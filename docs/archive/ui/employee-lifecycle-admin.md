# Employee Lifecycle Admin UI

## Purpose

The employee lifecycle admin UI provides HR and admin operators with a durable control surface for
employee create and deactivate workflows.

It is backed by the real Organization APIs and avoids hardcoded organizational or dictionary values.

## Routes

- `/admin/people/new`
- `/people/{id}` for deactivation from employee details

## Data sources

The UI uses live backend APIs:

- `POST /org/people`
- `POST /org/people/{id}/deactivate`
- `GET /org/chart`
- `GET /metadata/dictionaries`
- `GET /metadata/dictionaries/{id}`

Org unit options are resolved from the organization chart. Grade, role, and skillset options are
resolved from metadata dictionaries when those dictionaries are available.

## UI structure

### Create employee

The create flow lives at `/admin/people/new` and includes:

- employee identity fields: name and email
- org unit selector populated from the org chart
- optional grade selector from metadata
- optional role selector from metadata
- optional skillset multi-select from metadata
- loading, validation, success, and error states

### Deactivate employee

The deactivate action is exposed from the employee details page and includes:

- explicit deactivation action instead of delete
- success and error feedback
- lifecycle status update after successful deactivation
- reminder that history is preserved and deletion is unsupported

## Auth handling

Protected HR and admin actions use the bearer token stored in browser storage through the shared
HTTP client.

The UI does not expose secrets. The token helper only stores a bearer token locally so protected
actions can be tested against the secured backend in Docker-backed local environments.

## Components

- `EmployeeLifecycleForm`
  - renders the create employee form and inline validation states
- `AuthTokenField`
  - stores and clears a local bearer token for protected actions
- `EmployeeLifecycleAdminPage`
  - orchestrates loading, create submission, and success/error feedback

## Behavior

- does not hardcode org units, grades, roles, or skillsets
- submits new employees through the durable Organization runtime
- defaults lifecycle behavior to deactivation, never deletion
- keeps employee creation and deactivation aligned with backend audit expectations

## Tests

Coverage lives in:

- `frontend/src/routes/people/EmployeeLifecycleAdminPage.test.tsx`
- `frontend/src/routes/people/EmployeeDetailsPage.test.tsx`

The tests verify:

- the create flow renders and submits successfully
- validation errors are shown inline
- the deactivate action works from employee details
