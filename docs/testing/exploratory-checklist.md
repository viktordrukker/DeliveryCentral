# Exploratory Checklist

## Purpose

This checklist supports deeper exploratory testing after smoke passes. It is aimed at finding edge cases, UX confusion, stale state problems, and cross-page inconsistencies.

## Heuristic Focus Areas

- state freshness after mutation
- page-to-page consistency
- filter accuracy
- historical vs current truth
- integration failure isolation
- metadata-driven behavior

## Employee Directory and Details

- search with partial names, email fragments, and manager names
- use department and resource-pool filters together
- open multiple employee records in sequence and compare manager/org data consistency
- verify dotted-line summary does not appear as line-manager authority
- refresh details page directly on `/people/:id` and confirm data still resolves
- test missing-person route handling with an invalid id

## Project Registry and Details

- search by project code, not just project name
- filter linked external system with `JIRA`
- confirm external links do not change the internal project identity shown in titles and breadcrumbs
- compare internal-only vs Jira-linked projects for layout clarity
- verify archived external links are shown as archived if present

## Assignment Creation and Approval

- create assignments with boundary values:
  - allocation `1`
  - allocation `100`
  - open-ended end date
- try invalid dates and verify error clarity
- create multiple assignments for different people on the same project and compare list behavior
- verify list page, detail page, and dashboard stay consistent after approval
- confirm approval and rejection controls remain explicit and not hidden
- verify invalid repeat transitions are blocked consistently

## Manager Scope

- compare direct reports vs dotted-line people for the same manager
- open manager scope before and after creating an assignment for a subordinate
- verify quick links preserve useful context
- check that visibility cues do not imply approval authority where not implemented

## Work Evidence

- record evidence for:
  - assigned person
  - unassigned person
  - project with no prior assignments
- filter by source, person, and project combinations
- verify evidence appears in the work-evidence page without changing assignment state
- record multiple evidence entries for the same person/project and inspect list readability

## Planned vs Actual

- test each category intentionally:
  - assigned but no evidence
  - evidence but no approved assignment
  - matched records
  - anomalies
- compare results before and after:
  - creating assignment
  - approving assignment
  - adding work evidence
- verify results remain diagnostic only and do not mutate any state

## Dashboard

- compare dashboard counts with visible list pages
- use quick links from dashboard cards and verify the destination page supports the story implied by the card
- refresh after creating/approving assignments and recording evidence to look for stale summary behavior

## Jira Integration Admin

- trigger project sync multiple times and verify idempotent-looking behavior
- verify sync failure does not break project or assignment pages
- inspect status timestamps and summaries for clarity
- confirm no low-level secret/config values are exposed in the UI

## Metadata Admin

- switch between dictionaries with different entity types
- inspect inactive entries for clear visual distinction
- verify related custom field/workflow/layout summaries remain consistent with selected dictionary
- confirm page structure is ready for future editors without implying unsupported mutation

## Restructure and Historical Truth

- compare org and manager-related pages before and after scenario changes where available
- verify effective-dated reporting concepts are reflected in read models, especially manager scope and employee details
- look for places where only current state is shown and confirm placeholder language is honest

## Integration Safety

- run Jira sync, then verify:
  - projects are updated as expected
  - assignments do not change
  - planned-vs-actual is unaffected unless project metadata actually changed
- if a failure scenario is available, confirm the failure is visible in admin status but business pages remain usable

## Metadata-Driven Behavior Risks

- look for hardcoded statuses, dictionary values, or workflow labels in pages that should be metadata-driven
- compare metadata admin content with business page labels where relevant
- note any places where UI appears coupled to a specific organization dictionary

## Defect Logging Prompts

When logging exploratory issues, capture:

- page and route
- precondition data used
- whether issue is current-state only or historical-state related
- whether issue affects:
  - staffing truth
  - work evidence truth
  - org visibility
  - integration isolation
  - metadata-driven behavior
