# Team Dashboard

## Purpose

The team dashboard gives resource and delivery managers a compact operational
view of a reusable staffing unit.

## Team boundary

The current team model is backed by durable `ResourcePool` and
`PersonResourcePoolMembership` rows.

That means:

- teams remain distinct from org structure
- teams remain distinct from projects
- team membership can support cross-project staffing visibility
- dashboard aggregation reads persisted assignments and persisted projects

## Summary metrics

The dashboard exposes at minimum:

- team member count
- active assignments count
- projects involved
- project count
- people with no assignments
- people with evidence-alignment gaps
- cross-project spread
- bounded anomaly summary

## Aggregation approach

The dashboard reuses existing read-side concepts where practical:

- team membership from resource-pool membership
- person assignment counts from the person directory read model
- active project involvement from persisted assignment and project data
- evidence-alignment gap detection from the existing exception queue derivations
- bounded team anomaly counts from existing exception categories instead of ad hoc rules

## Safety rules

- no team dashboard mutation occurs here
- team/project/org concepts are not collapsed into one another
- the dashboard is an operational read model, not an authority change workflow
- anomaly signals stay team-scoped and do not turn into generic manager-subtree analytics
