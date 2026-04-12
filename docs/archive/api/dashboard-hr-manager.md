# HR Manager Dashboard API

The HR manager dashboard endpoint provides an organization-centric workforce view for one HR manager. It focuses on headcount, employee relationships, organizational distribution, and recent lifecycle activity rather than staffing delivery detail.

## `GET /dashboard/hr-manager/{personId}`

Returns at minimum:

- headcount summary
- active vs inactive employees
- org distribution
- grade distribution
- role distribution
- employees without manager
- employees without org unit
- recent joiner and deactivation activity

### Query parameters

- `asOf` optional ISO timestamp used for current organization and relationship evaluation

### Example

```http
GET /dashboard/hr-manager/11111111-1111-1111-1111-111111111005?asOf=2025-03-15T00:00:00.000Z
```

## Response shape

- `asOf`
- `person`
- `headcountSummary`
- `orgDistribution[]`
- `gradeDistribution[]`
- `roleDistribution[]`
- `employeesWithoutManager[]`
- `employeesWithoutOrgUnit[]`
- `recentJoinerActivity[]`
- `recentDeactivationActivity[]`
- `dataSources[]`

## Design notes

- the dashboard is organization-centric
- employee relationship validity is derived from the current person directory read model
- grade and role distributions come from internal employee records
- recent deactivation activity reuses business-audit records when available
- no staffing-sensitive operational detail is returned here
