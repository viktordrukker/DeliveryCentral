# Employee Details

## Purpose

The Employee Details page is the first employee-centric detail view in the frontend. It uses the existing person directory detail API as the current source of truth and reserves layout space for future employee portal capabilities.

## Data Source

The page uses:

- `GET /org/people/{id}`

No additional fields are invented in the UI. Where the backend does not yet provide data, the page renders explicit placeholder sections.

## Implemented Layout

- summary cards across the top
- employee summary section
- reporting relationships section
- active assignments summary block
- work evidence placeholder
- current workload placeholder
- future workload and history placeholder

## State Handling

- loading state while the employee record is fetched
- not-found state when the backend returns `404`
- error state for non-`404` failures

## Extensibility

The page is intentionally structured so future sections can be replaced incrementally:

- assignment widgets can replace the assignment placeholder
- work evidence cards can replace the evidence placeholder
- workload charts can replace the workload placeholder
- org and staffing history components can replace the history placeholder
