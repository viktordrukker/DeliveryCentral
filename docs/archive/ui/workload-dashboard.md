# Workload Dashboard

## Purpose
The Workload Dashboard is the executive-friendly summary view for the current workload state. It pulls from `GET /dashboard/workload/summary` and highlights the highest-value operational signals without collapsing into chart-heavy presentation.

## Route
- `/`

## Data shown
- total active projects
- total active assignments
- unassigned active people
- projects with no staff
- people with no active assignments
- projects with evidence but no approved assignment matches

## Navigation
The dashboard includes direct links to:
- project registry
- assignments
- people directory
- planned vs actual comparison

These links are intended to move users from summary to action or diagnosis quickly.

## UX notes
- summary cards stay at the top
- supporting lists stay concise
- empty states are explicit instead of hiding categories
- no charts are used because the current data model is better served by counts and exception lists
