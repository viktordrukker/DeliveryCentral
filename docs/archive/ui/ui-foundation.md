# UI Foundation

## Purpose

The frontend shell establishes a stable UI baseline for the Workload Tracking Platform without embedding business logic into presentational components.

## Stack

- React
- TypeScript
- Vite
- React Router
- Vitest and Testing Library

The frontend is isolated under `frontend/` so backend and UI dependencies remain separate.

## Design Rules

- desktop-first layout with responsive fallback
- reusable primitives for page, card, filter, table, loading, error, and empty states
- no hardcoded business dictionaries such as statuses, roles, departments, project types, or workflow values
- data access through typed API clients only
- business logic stays in API/query modules, not in visual components

## Implemented Shell

- top header
- left sidebar navigation
- page title and breadcrumb placeholder
- main content area
- route scaffolds for:
  - dashboard
  - org
  - people
  - projects
  - assignments
  - work evidence
  - cases
  - integrations
  - metadata/admin

## Reusable Primitives

- `PageContainer`
- `PageHeader`
- `SectionCard`
- `DataTable`
- `FilterBar`
- `EmptyState`
- `ErrorState`
- `LoadingState`

## Data Layer

`frontend/src/lib/api` contains:

- environment-driven API base configuration
- a typed HTTP client wrapper
- typed workload dashboard query integration

This keeps endpoint knowledge in one place and leaves route components focused on rendering.

## Current Example Page

The dashboard route calls `GET /dashboard/workload/summary` and renders:

- headline metrics
- projects with no staff
- people with no active assignments
- projects with evidence but no approved assignment match

The rest of the routes are scaffold placeholders ready for API-backed implementation.
