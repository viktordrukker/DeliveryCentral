# Work Evidence Page

## Purpose
The Work Evidence page provides visibility into observed work without presenting it as staffing truth. It is a read-only operational view over `GET /work-evidence` and is designed to stay compatible with internal, Jira, and future evidence sources.

## Route
- `/work-evidence`

## Data shown
- person
- project
- source
- effort / hours
- activity date

## Filters
- person: client-side text filter using resolved person names
- project: client-side text filter using resolved project names
- source: API-backed `sourceType` filter
- date from / date to: API-backed range filters

## Boundary notes
- work evidence is observational data, not assignment truth
- source remains explicit in the table so imported evidence is not confused with internal staffing records
- people and project names are resolved from existing read APIs rather than hardcoded dictionaries
