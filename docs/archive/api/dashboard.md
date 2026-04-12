# Dashboard API

## Purpose

The dashboard API provides:

- role-shaped summary views at `GET /dashboard/{role}`
- employee self-oriented detail at `GET /dashboard/employee/{personId}`
- project-manager project-oriented detail at `GET /dashboard/project-manager/{personId}`
- resource-manager capacity-oriented detail at `GET /dashboard/resource-manager/{personId}`
- hr-manager organization-centric detail at `GET /dashboard/hr-manager/{personId}`

Both endpoints reuse existing read-side aggregates instead of introducing a second source of truth.

## Endpoint

### `GET /dashboard/{role}`

Supported roles:

- `employee`
- `project_manager`
- `resource_manager`
- `hr_manager`

Optional query parameters:

- `asOf`

### `GET /dashboard/employee/{personId}`

Detailed employee dashboard payload for one person.

Optional query parameters:

- `asOf`

### `GET /dashboard/project-manager/{personId}`

Detailed project-oriented dashboard payload for one internal project manager.

Optional query parameters:

- `asOf`

### `GET /dashboard/resource-manager/{personId}`

Detailed capacity-oriented dashboard payload for one internal resource manager.

Optional query parameters:

- `asOf`

### `GET /dashboard/hr-manager/{personId}`

Detailed organization-centric dashboard payload for one internal HR manager.

Optional query parameters:

- `asOf`

## Response shape

The response is intentionally stable and extensible:

- `role`
- `asOf`
- `summaryCards[]`
- `sections[]`
- `dataSources[]`

### `summaryCards[]`

Each card contains:

- `key`
- `label`
- `value`

### `sections[]`

Each section contains:

- `key`
- `title`
- `itemCount`
- `items[]`

Each item contains:

- `id`
- `title`
- `subtitle` optional
- `detail` optional

## Role-specific behavior

### `employee`

Focuses on:

- matched work and staffing records
- anomaly visibility
- overall active assignment context

### `project_manager`

Focuses on:

- assigned-but-no-evidence gaps
- projects with evidence but no approved assignment match
- matched delivery records

### `resource_manager`

Focuses on:

- people with no active assignments
- projects with no staff
- assignments needing follow-up

### `hr_manager`

Focuses on:

- unassigned employees
- workforce anomalies
- projects without staff that may imply organization or lifecycle gaps

## Design rules

- reuses existing dashboard aggregates
- does not create a second source of truth
- keeps role-specific shaping in the dashboard layer only
- unsupported roles are rejected with `400`
