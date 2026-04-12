# Admin Panel

## Purpose

The admin panel provides a consolidated control surface for platform operators at `/admin`.
It is intentionally config-driven and consumes backend aggregation endpoints rather than
embedding business-specific dictionaries, integrations, or runtime flags in the UI.

## Data sources

The page loads four admin aggregation endpoints in parallel:

- `GET /admin/config`
- `GET /admin/settings`
- `GET /admin/integrations`
- `GET /admin/notifications`

These endpoints keep the page extensible. New dictionaries, notification templates,
integration providers, or system flags can appear without page-level business logic changes.

## UI structure

The page is split into two areas:

- Sidebar navigation
  - Dictionaries
  - Integrations
  - Notifications
  - System Settings
- Main panel
  - dynamic cards rendered from aggregated admin data
  - reusable viewers for lists and key-value config entries

## Reusable components

The admin page is composed from three generic components:

- `AdminSectionCard`
  - wraps a section card with title and explanatory copy
- `AdminList`
  - renders config-driven list items with lightweight metrics
- `AdminConfigViewer`
  - renders key-value operational settings and summaries

## States covered

The page handles:

- loading
- error
- empty aggregated admin state
- successful data render

## Guardrails

- no hardcoded dictionary names are required for rendering
- no business logic is embedded in the page
- runtime flags, integrations, and templates are rendered from backend contracts
- the UI remains an operator surface, not a workflow engine

## Tests

Frontend coverage lives in:

- `frontend/src/routes/admin/AdminPanelPage.test.tsx`

The tests verify:

- page render
- section visibility
- data mapping across multiple admin sections
- empty state behavior
