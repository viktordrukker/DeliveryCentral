# Ownership Matrix

_Last reconciled: 2026-05-23. Core 10 rows intact; 5 new rows added at the bottom._

## Core 10

| Context | Owns | Publishes | Consumes | Must Never Own |
|---|---|---|---|---|
| Identity & Access | identity accounts, roles, permissions, access policies, OIDC/LDAP/M365 sync | account provisioned, account suspended, policy changed | person created, employment status changed, case approved | org hierarchy, projects, assignments, work evidence |
| Organization & Org Chart | people, org units, reporting lines, manager scope history | person changed, org unit changed, reporting line changed, manager scope changed | external HR sync outputs, account linkage events | assignments, projects, case workflow, notification delivery |
| Project Registry | project, project external link, project status | project created, updated, archived, external link changed | external project discovered, metadata schema updates | assignments, work evidence, staffing approvals |
| Assignment & Workload | project assignment (9-state CSW), assignment approval flow, capacity rules, workload views | assignment proposed / rejected / booked / onboarding / assigned / on-hold / released / completed / cancelled, workload threshold exceeded | person/org changes, project lifecycle events, policy changes | Jira issue assignee state, work evidence truth, external link ownership |
| Time & Work Evidence | work evidence, time entries, leave, overtime, period locks, import batches, evidence source links | work evidence recorded, evidence import completed, assignment-evidence variance detected | external evidence imports, person/project references, assignment lifecycle events for analytics only | assignment mutation, project catalog truth, org ownership |
| Onboarding / Offboarding / Case Management | lifecycle cases, case tasks, case decisions, transition checklists | case opened, case approved, offboarding impact detected | person employment changes, assignment changes, account state changes | assignment truth, org structure truth, integration adapter logic |
| Integrations Hub | provider adapters (Jira PPM, M365, RADIUS, JSM, LDAP, LLM), sync jobs, external envelopes, connection config | external project discovered, external evidence imported, sync failed | sync commands, metadata mapping config, case-triggered provisioning commands | canonical project identity, assignments, org chart truth |
| Notifications | notification requests, templates, channels, delivery records, preferences, in-app inbox, outbox publisher (D-142) | notification queued / delivered / failed; nudge proposal acknowledgment overdue | business events from all contexts | approval decisions, assignments, org chart semantics |
| Audit & Observability | hash-chained `AuditLog`, prom-client `/metrics`, structured logs, diagnostics surface, deep health probe, retention policy | compliance alert raised, integration health degraded | all domain/integration events | business state authority in any operational domain |
| Customization / Metadata | custom field definitions, validation rules, schema versions, `PlatformSetting` + role-preset overrides | metadata schema published, custom field enabled, validation rule changed, preset overridden | admin commands only | operational records, integration adapters, project or assignment instances |

## Rows added in subsequent phases

| Context | Owns | Publishes | Consumes | Must Never Own |
|---|---|---|---|---|
| Financial Governance + Project Radiator | `ProjectBudget` (+5 EVM columns), `BudgetApproval`, RAG snapshot, 16-axis PMBOK radar, `RadiatorThresholdConfig`, `ProjectRadiatorOverride`, `FxRate`, `FiscalCalendar`, `Currency`, `RateCard` | budget changed, RAG snapshot taken, radiator override applied, budget approval requested / approved / rejected | project + assignment + work-evidence (read), platform settings | project identity, assignment truth, integration adapters |
| Staffing Desk + Workforce Planner | `StaffingRequest`, `StaffingRequestProposalSlate`, `StaffingRequestProposalCandidate`, `StaffingRequestFulfilment`, `PlannerScenario`, 3-tier solver (chain/qualified/fallback), HC-diagnostics | staffing request opened / filled / cancelled, slate proposed / approved / rejected, scenario saved | person + skill + reporting-line + capacity (read), assignment events for derived status | canonical `ProjectAssignment` truth (emitted via `TransitionProjectAssignmentService`), org chart |
| Help Center | `HelpArticle`, `HelpTip`, `HelpFeedback`, `OnboardingTourProgress` | article published / archived, feedback received | role principal (for editor gating) | business state, RBAC policy |
| Pulse | `PulseEntry` (anonymized), `PulseReport` (aggregated mood + heatmap) | mood report generated | none (write-only entry path from authenticated users; aggregator reads only its own rollups) | individual person identity correlation outside owner; surface to anyone except aggregated reads |
| Setup Wizard | `SetupRun`, `SetupRunLog`, X-Setup-Token boundary | setup screen advanced, setup completed, diagnostic bundle generated | DB / migration / seed primitives; admin enrollment payload | runtime business state once setup completes (wizard self-deactivates) |

## Ownership distinctions (unchanged + extended)

- `Project` and `ProjectExternalLink` are not the same thing — Registry owns both, but they remain separate entities.
- `Assignment` and `WorkEvidence` are distinct truth models owned by different contexts.
- `Person` belongs to Organization; `LocalAccount` / external identity links belong to Identity & Access.
- `OrgUnit` hierarchy and `ReportingLine` graph are separate organizational constructs.
- `Case` workflow and assignment approval workflow are separate process models.
- Metadata schema is configuration, not business operational data.
- Notification request and delivery record are separate concerns within Notifications.
- **Slate** (Staffing Desk) and **Assignment** (Assignment & Workload) are separate — slates are proposals; assignments are canonical state. Booking flows from slate → assignment via `TransitionProjectAssignmentService`.
- **Radiator score** (Financial Governance) is derived from many contexts (budget + assignments + cases + RAG) — never the source-of-truth for any of them.
- **Pulse entry** never correlates back to a person outside the entry's owner — even admins see only aggregated `PulseReport` rollups.
