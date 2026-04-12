# Project Closure UI

## Purpose

Project closure stays governed and explicit in the UI. Normal closure remains the default path, and override is only surfaced when the backend reports a real blocking staffing conflict.

## Route

- `/projects/{id}`

## Data Sources

- `GET /projects/{id}`
- `POST /projects/{id}/close`
- `POST /projects/{id}/close-override`

## Normal Close Path

The standard close action is available from the project details lifecycle controls.

Behavior:

- requires confirmation
- captures returned workspend summary
- preserves project history
- does not hide closure results behind a silent refresh

## Override Path

The override panel appears only when all of the following are true:

- the project close request is blocked by the backend because active assignments still exist
- the current stored token carries `director` or `admin`
- the operator remains on the project lifecycle surface

The override flow requires:

- explicit reason entry
- confirmation
- backend-authoritative closure result

## UX Rules

- override is styled as a governance action, not an ordinary lifecycle shortcut
- reason entry is mandatory in the UI before submission
- impact messaging explains that active staffing still exists
- success messaging makes the audit implication explicit
- users without governance roles do not see the override action

## Audit Visibility

The UI does not render raw audit payloads here, but successful override messaging explicitly points to the fact that the reason is captured in the audit trail.

Operators can review related governance records through:

- `/admin/audit`
- `/exceptions`

## Related Surface

When the exception queue shows `PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS`, the detail panel links the operator back into project details so the governed closure controls are used instead of inventing a second override entry point.

## Tests

Coverage lives in:

- `frontend/src/routes/projects/ProjectDetailsPage.test.tsx`

The tests verify:

- override UI renders when a real closure conflict is returned
- reason is required
- success flow calls the real override API client
- override is not shown as a default action
