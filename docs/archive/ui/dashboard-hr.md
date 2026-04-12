# HR Dashboard UI

The HR dashboard provides an organization-centric view over workforce structure and people-data health.

## Route

`/dashboard/hr`

## Data sources

- `GET /dashboard/hr-manager/{id}`
- `GET /org/people`

## UI sections

- headcount summary cards
- org distribution
- headcount and quality signals
- roles and grades

## Notes

- the page is read-oriented and does not mutate employee records
- people selection is loaded from the employee directory
- the dashboard stays organization-centric rather than exposing staffing workflow detail
