# Integration Admin UI

## Route
- `/admin/integrations`

## Purpose
- Provide an operator-focused integration control surface.
- Show provider status without exposing credentials or transport configuration.
- Allow supported sync actions to be triggered from the UI.

## Data Sources
- `GET /admin/integrations`
- `GET /integrations/jira/status`
- `GET /integrations/history`
- `GET /integrations/m365/directory/status`
- `GET /integrations/m365/directory/reconciliation`
- `GET /integrations/radius/status`
- `GET /integrations/radius/reconciliation`
- `POST /integrations/jira/projects/sync`
- `POST /integrations/m365/directory/sync`
- `POST /integrations/radius/accounts/sync`

## UI Structure
- Integration list
  - one card per provider
  - status and latest summary visible at a glance
- Status overview
  - provider-specific operational details
  - last sync time and outcome
- Recent sync runs
  - bounded sync history per provider
  - started and finished timestamps
  - processed-item summary when available
  - failure summary when a run failed
- M365 reconciliation review
  - category counts for matched, unmatched, ambiguous, and stale/conflict identities
  - searchable review list for operator investigation
  - links back into people, assignments, teams, and projects
- RADIUS reconciliation review
  - category counts for matched, unmatched, ambiguous, and presence-drift accounts
  - searchable account-presence review list for operator investigation
  - links back into people, assignments, and business-audit follow-up
- Operations panel
  - sync trigger for the selected provider

## Components
- `IntegrationCard`
- `StatusIndicator`
- `SyncButton`

## Guardrails
- No credentials, tokens, webhook URLs, or adapter secrets are shown.
- The UI displays status and operational summaries only.
- Sync history is distinct from business audit browsing. It is a provider-oriented operational view rather than a generic audit stream.
- Provider-specific sync actions are routed through backend endpoints rather than embedding business or credential logic in the page.
- M365 reconciliation review is read-only. It helps operators understand external identity drift without mutating internal org truth or writing back to M365.
- RADIUS reconciliation review is read-only. It helps operators understand external account-presence drift without treating RADIUS as internal org truth or writing back to RADIUS.

## Tests
- `frontend/src/routes/admin/IntegrationsAdminPage.test.tsx`
  - status display
  - sync trigger
  - sync history rendering
  - M365 reconciliation review rendering
  - RADIUS reconciliation review rendering
