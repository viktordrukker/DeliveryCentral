# Domain Glossary

_Last reconciled: 2026-05-23. Core 14 terms intact; new terms added at the bottom from phases since 2026-04._

## Core 14

### Project
Canonical internal representation of a staffed initiative or delivery effort inside the platform. Owned by Project Registry. May exist before any external link is attached.

### Project External Link
Reference from an internal `Project` to an external system identifier and URL (Jira PPM today; ALM/finance later). Not the project identity — one project can carry multiple external links over time.

### Assignment
Formal internal allocation of a person to a project with approval state, timing, and workload semantics. Authoritative only inside the platform — never created or mutated from Jira issue data. Lifecycle is the 9-state canonical staffing workflow (Phase CSW).

### Workload
Calculated view of planned commitments against a person, team, manager scope, or org unit for a given period. Derived from assignments + capacity rules, not from external issue ownership.

### Capacity
Available allocatable effort for a person or group over a period after applying employment status, schedules, leave assumptions, overtime policy, and policy constraints.

### Work Evidence
Observed data indicating work happened (time entries, imported Jira activity). Used for audit, analytics, and variance detection — can exist with or without a matching approved assignment.

### Person
Human business subject represented in organizational and workload processes.

### IdentityAccount (`LocalAccount`)
Security and authentication principal used for platform access. A `Person` and a `LocalAccount` are related but distinct entities. External IdP identities also link via `PersonExternalIdentityLink`.

### Line Manager
Primary reporting manager in the organizational structure. Expresses formal reporting responsibility but does not automatically imply staffing approval authority in every policy model.

### Resource Manager
Actor with policy-granted authority over staffing, workload, and capacity decisions. May differ from the line manager and may vary over time by organization policy.

### Dotted-line Manager
Secondary or matrix manager with visibility and possibly review rights, but not necessarily assignment approval rights. Modeled separately from formal approval authority.

### Org Unit
Hierarchical organizational node used for structural ownership, visibility, budgeting, or policy scope. Distinct from reporting lines between people.

### Approval State
Lifecycle state describing a decision process outcome (requested, approved, rejected, revoked, on-hold). Contextual — not reused blindly across assignments, cases, or integrations.

### Case
Managed lifecycle process for onboarding, offboarding, access transition, or other operational workflows that intersect with assignments + org structure. Case workflow is separate from assignment workflow.

### ReportingLine
Effective-dated relationship that defines who oversees whom and under which relationship type (solid-line, dotted-line).

## Terms added in subsequent phases

### Staffing Request (`StaffingRequest`)
Demand record from a PM/RM expressing a need for headcount on a project. Derived status (`Open` / `In progress` / `Filled` / `Closed` / `Cancelled`) computed by `DeriveStaffingRequestStatusService` from per-slot assignment pipeline.

### Slate (`StaffingRequestProposalSlate` + `StaffingRequestProposalCandidate`)
Set of proposed people for a staffing request, owned by Staffing Desk. Approval of the slate triggers canonical assignment booking via `TransitionProjectAssignmentService`.

### Planner Scenario (`PlannerScenario`)
Server-persisted "what-if" run of the Workforce Planner. Captures filters + strategy + 3-tier solver result (chain / qualified / fallback) over multi-week `coverageWeeks`. See `docs/planning/reference-planner-distribution-studio.md`.

### Canonical Assignment Status
9 values: `Proposed`, `Rejected`, `Booked`, `Onboarding`, `Assigned`, `On hold`, `Released`, `Completed`, `Cancelled`. Each transition has explicit role + reason requirements per `ASSIGNMENT_STATUS_TRANSITIONS` matrix.

### Project Radiator
16-axis PMBOK radar score per project (Phase PR-v1). Owners may override per-axis with reason + audit; `RadiatorThresholdConfig` allows per-tenant threshold tuning.

### EVM (Earned Value Management)
5 columns on `ProjectBudget`: `plannedValue`, `earnedValue`, `actualCost`, `costVariance`, `scheduleVariance`. Drives Financial Governance dashboards + radiator's Cost + Schedule axes.

### Help Article + Help Tip
`HelpArticle` is a long-form help page; `HelpTip` is a contextual tooltip body. Both rendered safely via `react-markdown` with strict allowed-elements whitelist (CLAUDE.md approved packages).

### Pulse Entry / Pulse Report
`PulseEntry` is an anonymized mood signal. `PulseReport` is an aggregated rollup (mood + heatmap). Individual entries never surface unredacted outside their owner. Off-by-default opt-in per bank install.

### Tenant
`Tenant` model exists (DM-7.5) but bank-IT pivot keeps single-tenant per-install. Multi-tenant code stays behind `flag.tenancy.multiTenant.enabled=false`.

### Public Id (`publicId`)
Opaque tenant-scoped prefixed identifier (`prj_…`, `usr_…`, etc.) replacing raw UUIDs in browser-visible URLs + payloads + analytics. DM-2.5 rollout in flight; rule enshrined in `feedback-no-uuids-in-browser.md` memory.

### Bank-specific roles (added per-tenant)
Bank installs may define their own shapes — Squad Lead, Tribe Lead, IT Service Owner. Added by the tenant admin via the D-159 admin UI; not pre-baked into the 7-role const tuple.

### Period Lock (`PeriodLock`)
Closes a time window (week / month) for further timesheet/leave mutations. Admin-only (D-93, Sprint F-2.0a). Admin UI at `/admin/period-locks`.

### Outbox Event (`OutboxEvent` + `DomainEvent`)
DM-7-era reliable event publication mechanism. Producers + publisher wired in Sprint F-6.5 (D-142). `flag.outboxEnabled` ON since F-6.

### Setup Run (`SetupRun` + `SetupRunLog`)
Records each pass of the `/setup` wizard with verbose logs and a single-click diagnostic bundle for support. CLAUDE.md §10.
