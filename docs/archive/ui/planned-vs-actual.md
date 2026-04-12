# Planned vs Actual

## Purpose
The Planned vs Actual page is a diagnostic management and audit view. It compares formal assignments with observed work evidence and keeps each category explicit so staffing truth is never confused with operational evidence.

## Route
- `/dashboard/planned-vs-actual`

## Data source
- `GET /dashboard/workload/planned-vs-actual`

## Categories
- assigned but no evidence
- evidence but no approved assignment
- matched records
- anomalies

## Filters
- project id
- person id
- as-of timestamp

## Boundary notes
- this page is read-only
- it does not create, mutate, approve, or reconcile records from the UI
- categories are separated intentionally to support manager review and audit use cases without hiding mismatches behind a single metric
