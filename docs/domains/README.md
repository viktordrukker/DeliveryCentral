# Domains — Index + Staleness Note

_Last reconciled: 2026-05-23. These 22 files were written 2026-03..2026-04 and **predate** Phase HD, Phase PR-v1, Phase CSW, F-series sprints, and the bank-IT pivot. Concepts are mostly stable; specifics (statuses, endpoints, event lists, integration adapters) have changed in many of them._

For the current operational truth always prefer:

- **Code**: `src/modules/<domain>/` is the source of truth.
- **Schema**: `prisma/schema.prisma` (106 models).
- **Tracker**: [`docs/planning/MASTER_TRACKER.md`](../planning/MASTER_TRACKER.md) (status table at top + per-phase per-item check-off).
- **Snapshot**: [`docs/planning/current-state.md`](../planning/current-state.md) (refreshed per sprint).
- **API**: [`docs/api/README.md`](../api/README.md) (refreshed 2026-05-23).
- **Domain concepts**: [`docs/product/`](../product/) (refreshed 2026-05-23).

## Files in this directory

| File | Coverage | Staleness |
|---|---|---|
| `admin.md` | Admin surface basics | Likely OK in shape; specifics expanded (admin/role-presets, admin/audit-retention, admin/integrations/registry, etc.) |
| `assignment-and-evidence.md` | Assignment vs evidence boundary | OK in shape; boundary intact |
| `assignment-approval.md` | Approval shape | **PARTIALLY STALE** — pre-CSW; canonical 9-state workflow shipped 2026-04-18 |
| `assignment-creation.md` | Create assignment shape | **PARTIALLY STALE** — `staffingRequestId` FK + slate flow added |
| `assignment-lifecycle.md` | Lifecycle states | **STALE** — lists 4 statuses; current is 9-state CSW |
| `bulk-assignment.md` | Bulk operations | OK |
| `business-audit.md` | Hash-chained AuditLog | OK in shape; D-114 admin page + D-167 v1 redact-payload + D-168 retention + D-111 CHECKs added |
| `case-management.md` | Case shape | OK in shape; D-91 approve action + EMP-CASE + EMPLOYEE_ISSUE enum added |
| `customization.md` | Custom fields | OK in shape; PlatformSetting overrides + role-preset overrides (F-5) extend it |
| `dictionaries.md` | MetadataDictionary | OK in shape; T-09 D-107 migrates 9 enums to dictionaries (Sprint F-12) |
| `employee.md` | Employee shape | OK |
| `employee-lifecycle.md` | Lifecycle events | OK in shape; `EmployeeActivityEvent` + `EmploymentEvent` formalized |
| `exceptions.md` | Exception queue | OK |
| `notifications.md` | Notifications domain | **PARTIALLY STALE** — outbox publisher (D-142, F-6.5) + many new events + nudge + SLA pre-breach not listed |
| `org-structure.md` | OrgUnit shape | OK |
| `organization.md` | Org domain | OK in shape; M365 / LDAP / OIDC adapters extend identity |
| `project-closure.md` | Closure shape | OK in shape; `RestoreProjectService` + workspend summary intact |
| `project-lifecycle.md` | Project lifecycle | **PARTIALLY STALE** — pre-PR-v1; milestones + change requests + radiator + EVM + 5 budget columns added |
| `project-registry.md` | Project registry | OK in shape |
| `team-dashboard.md` | Team dashboard | OK in shape; many new dashboards per role added |
| `team-management.md` | Team management | OK |
| `work-evidence-ingestion.md` | Evidence ingestion | OK in shape; D-116 self-scope widened |

## Refresh approach

Refresh per-file when the corresponding domain code is touched. A new `Sprint F-N` that lands work in `src/modules/<X>/` should refresh `docs/domains/<X>.md` as part of the PR. Don't bulk-rewrite — context decays without the code change driving the doc change.

Files marked **STALE** or **PARTIALLY STALE** above carry a 1-line warning banner at the top.
