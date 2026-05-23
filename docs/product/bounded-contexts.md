# Bounded Contexts

_Last reconciled: 2026-05-23. Original 10 contexts intact; 4 contexts added in subsequent phases listed at bottom._

## Core 10

### Identity & Access

Owns authentication, authorization, access policy, and identity accounts. Includes local-account, OIDC (Entra-primary), LDAP/AD, and M365 directory sync.

### Organization & Org Chart

Owns people, org units, reporting lines, and manager scope over time.

### Project Registry

Owns canonical internal projects and their external links.

### Assignment & Workload

Owns formal staffing assignments, approvals, and workload/capacity calculations. Canonical 9-state staffing workflow (Phase CSW, 2026-04-18).

### Time & Work Evidence

Owns observed time, leave, work evidence records, and overtime — separate from assignments.

### Onboarding / Offboarding / Case Management

Owns lifecycle cases and the process coordination around staffing and access impacts.

### Integrations Hub

Owns provider adapters, sync orchestration, and anti-corruption translation. Adapters: Jira PPM, M365 directory, RADIUS, JSM, LDAP, local-LLM scaffold.

### Notifications

Owns notification requests, templates, preferences, and delivery records. Channels: in-app, email, ms_teams_webhook, generic. Outbox publisher ON (D-142).

### Audit & Observability

Owns hash-chained `AuditLog`, prom-client `/metrics`, structured logs, diagnostics surface, deep health probe.

### Customization / Metadata

Owns custom field definitions, validation schema, and metadata configuration by entity type. Includes `PlatformSetting` overrides + role-preset overrides (D-130 step 2).

## Contexts added since 2026-03

### Financial Governance + Project Radiator (Phase PR-v1)

Owns `ProjectBudget` (+5 EVM columns), `BudgetApproval`, EVM scoring, 16-axis PMBOK radar (`ProjectRadiatorOverride` + `RadiatorThresholdConfig`), portfolio rollup, PDF/PPTX export. Currency + `FxRate` (D-164, flag-gated) and `FiscalCalendar` (D-160b, flag-gated) sit here.

### Staffing Desk + Workforce Planner

Owns slate-based proposal flow (`StaffingRequestProposalSlate` + `StaffingRequestProposalCandidate`), drag-and-drop placement, `PlannerScenario` (server-persisted), 3-tier solver (chain / qualified / fallback) with 5 strategies + multi-week `coverageWeeks`. See `docs/planning/reference-planner-distribution-studio.md`.

### Help Center

Owns `HelpArticle`, `HelpFeedback`, `HelpTip`, public list, article detail, feedback widget, onboarding tour. HD-9 closed 2026-05-09. Flag-gateable per bank install (`flag.helpCenter.enabled`).

### Pulse

Owns `PulseEntry` + `PulseReport` — anonymized mood + heatmap. Off-by-default opt-in (bank-IT pivot locked decision 2026-05-10).

### Setup Wizard

Owns `SetupRun` + `SetupRunLog` + the X-Setup-Token boundary + the 8-screen install flow. See CLAUDE.md §10.

## Bank-IT framing (locked 2026-05-10)

Single-tenant per-bank install. `Tenant` model + `tenantId` on 15 aggregates (DM-7.5) exist behind `flag.tenancy.multiTenant.enabled=false`. Bank-specific role shapes (Squad/Tribe Lead, IT Service Owner) are added by the tenant admin via the D-159 admin UI on installation, not pre-baked.
