# Jira Integration Status

## Purpose
The Jira Integration Status page is an operator-facing admin view. It surfaces adapter status and project sync outcomes without leaking secrets, credentials, or low-level connection details into the UI.

## Route
- `/integrations`

## Data sources
- `GET /integrations/jira/status`
- `POST /integrations/jira/projects/sync`

## What the page shows
- Jira adapter status
- last sync time
- last sync outcome
- last sync summary
- whether project sync and work evidence capabilities are available
- explicit action to trigger project sync

## Boundary notes
- this is operations UI, not staffing UI
- the page does not expose secrets or connection configuration
- business project and staffing pages remain separate from integration mechanics
