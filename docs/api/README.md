# API Reference

All endpoints are under the `/api` prefix. Full OpenAPI docs available at `/api/docs` (non-production). Archived per-module specs are in `docs/archive/api/`.

| Module | Endpoints | Description |
|--------|-----------|-------------|
| Assignments | `POST /assignments`, `GET /assignments`, `GET /assignments/:id`, `PATCH /assignments/:id` | Formal internal project assignments and lifecycle |
| Assignments Bulk | `POST /assignments/bulk` | Batch assignment creation with partial-success model |
| Cases | `POST /cases`, `GET /cases`, `GET /cases/:id`, `PATCH /cases/:id` | Onboarding case management linked to people and staffing |
| Dashboard - Employee | `GET /dashboard/employee/:personId` | Self-oriented employee read model (assignments, workload, evidence) |
| Dashboard - HR Manager | `GET /dashboard/hr-manager/:personId` | Organization-centric workforce view (headcount, distribution) |
| Dashboard - Project Manager | `GET /dashboard/project-manager/:personId` | Project-oriented view (staffing, coverage, anomalies) |
| Dashboard - Resource Manager | `GET /dashboard/resource-manager/:personId` | Capacity-oriented view (teams, availability, pipeline) |
| Dashboard - Workload | `GET /dashboard/workload/summary` | Aggregated workload summary for dashboard cards |
| Dashboard | `GET /dashboard/:role`, plus role-specific endpoints | Role-shaped summary views and detail endpoints |
| Diagnostics | `GET /diagnostics` | Operator-facing runtime diagnostics (DB, config, health) |
| Exceptions | `GET /exceptions` | Derived exception queue with category/status/provider filters |
| Manager Scope | `GET /org/managers/:id/scope` | Manager visibility: direct reports, org units, assignments |
| Org People | `POST /org/people`, `GET /org/people`, `GET /org/people/:id`, `PATCH /org/people/:id` | Employee CRUD in the Organization domain |
| Person Directory | `GET /org/people` | Paginated person directory for workload planning |
| Projects | `POST /projects`, `GET /projects`, `GET /projects/:id`, `PATCH /projects/:id` | Internal project registry with lifecycle and external links |
| Teams | `GET /teams`, `POST /teams`, `GET /teams/:id`, `PATCH /teams/:id` | Operational resource pool / team management |
| Work Evidence | `POST /work-evidence`, `GET /work-evidence` | Observed work records independent from formal assignments |
