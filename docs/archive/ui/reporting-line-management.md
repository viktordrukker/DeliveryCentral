# Reporting Line Management UI

## Purpose

The reporting-line management UI gives HR, resource managers, directors, and admins a practical way
to assign or change solid-line manager relationships with effective dates.

The flow is embedded in employee details so reporting governance stays attached to the employee
record rather than being mixed into org-unit editing.

## Surface

- `/people/{id}`
  - section: `Reporting Line Management`

## Data sources

The UI uses live backend APIs:

- `GET /org/people/{id}`
- `GET /org/people?page=1&pageSize=100`
- `POST /org/reporting-lines`

Current reporting relationships come from the employee details payload. Manager selection uses the
person directory so the UI does not hardcode manager relationships.

## Supported workflow

The management form supports:

- employee context from the current details page
- manager selection from live people data
- reporting type selection
  - currently only `SOLID`, matching the current backend contract
- start date
- optional end date

## Behavior

- preserves historical semantics by creating a new effective-dated reporting line instead of
  overwriting UI state
- validates required manager and start date inputs
- validates end date is not earlier than start date
- prevents self-reporting selection in the UI
- shows current solid-line manager before the change is submitted
- shows success feedback for immediate and future-dated manager changes
- shows a latest scheduled change summary after save when available in local UI state

## Auth handling

The reporting-line action uses the shared bearer-token flow already present in employee details.
The token is stored locally in the browser and is not rendered back after save.

## Components

- `ReportingLineForm`
  - renders manager, type, start-date, and end-date controls
- `useReportingLineManagement`
  - loads manager options, validates input, and submits effective-dated changes
- `EmployeeDetailsPlaceholderPage`
  - hosts the reporting management section alongside current relationship details

## Tests

Coverage lives in:

- `frontend/src/routes/people/EmployeeDetailsPage.test.tsx`

The tests verify:

- the management flow renders on employee details
- a valid reporting-line change submits successfully
- validation errors are shown for incomplete input
