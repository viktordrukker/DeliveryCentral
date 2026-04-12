# Team Dashboard UI

## Purpose

The Team Dashboard provides a team-centric operational view at:

- `/teams/{id}/dashboard`

It is meant for Team Delivery Manager and Resource Manager workflows and stays distinct from:

- org unit hierarchy
- project dashboards
- generic manager scope views

## Data Source

The page uses:

- `GET /teams/{id}/dashboard`

## Rendered Summary

The dashboard shows:

- team summary
- team member count
- active assignments count
- projects involved
- project count
- people with no assignments
- evidence alignment gaps
- cross-project spread
- anomaly summary

## Operational Navigation

The page provides direct navigation to related surfaces:

- back to team management
- people directory
- assignments view
- exception queue
- project details for involved projects
- person details for unassigned team members
- person details for cross-project or evidence-gap cases

## UI Behavior

- loading state while the team dashboard is fetched
- not-found state when the backend returns `404`
- error state for non-`404` failures
- empty-state messaging when no projects or no unassigned people are present
- empty-state messaging when no cross-project spread or no evidence-alignment anomalies are present

## Design Rules

- teams remain operational groups, not org units
- the page stays team-centric and readable
- it does not mix the team dashboard into generic manager scope
- no mutation occurs from the dashboard itself
- anomaly signals are bounded summaries, not a raw exception dump

## Tests

Coverage lives in:

- `frontend/src/routes/teams/TeamDashboardPage.test.tsx`

The tests verify:

- dashboard data renders
- empty sections render clearly
- missing team handling
- API error handling
- anomaly-aware sections render when present
