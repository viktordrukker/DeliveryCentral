# Context Map

_Last reconciled: 2026-05-23. Adds Financial Governance, Staffing Desk + Workforce Planner, Help Center, Pulse, Setup since the original 2026-03 doc._

## Core topology

```text
Identity & Access ----> Organization & Org Chart ----> Assignment & Workload <---- Project Registry
        |                          |                            |                        ^
        |                          |                            v                        |
        |                          +------------------> Case Management                  |
        |                                                       |                        |
        v                                                       v                        |
Notifications <------------------------------------------- business events               |
                                                                                         |
Integrations Hub ----> Project Registry ---------------------------------------+
Integrations Hub ----> Time & Work Evidence
Integrations Hub ----> Identity & Access / Organization sync adapters (M365, LDAP, OIDC)
Time & Work Evidence -----> Audit & Observability
Assignment & Workload ----> Audit & Observability
All contexts -------------> Audit & Observability
Customization / Metadata -> all operational contexts as configuration only

Assignment & Workload <--- Staffing Desk + Workforce Planner (planner scenarios,
                                                              slate-based proposals,
                                                              3-tier solver)

Project Registry <-------> Financial Governance + Project Radiator
                              (ProjectBudget + EVM, 16-axis PMBOK,
                               FxRate, FiscalCalendar — both flag-gated)

Identity & Access --------> Help Center (gates editor by role)
All authenticated users --> Help Center (article reads + feedback + onboarding tour)

All people (opt-in) ------> Pulse (anonymized PulseEntry / PulseReport)

Setup Wizard --(one-time)-> Identity & Access (create admin) +
                            Customization / Metadata (apply migrations + seed) +
                            Integrations Hub (configure adapters)
```

## Relationship rules

- **`Project Registry`** owns internal `Project` and `ProjectExternalLink`.
- **`Assignment & Workload`** owns authoritative `ProjectAssignment`, 9-state CSW workflow, and workload calculations.
- **`Staffing Desk + Workforce Planner`** owns proposal slates + scenario persistence; emits booked assignments into `Assignment & Workload`. Never owns staffing truth on its own.
- **`Time & Work Evidence`** owns observed work facts + variance detection inputs + overtime policies.
- **`Integrations Hub`** translates external systems through adapters and anti-corruption mapping. It does not own staffing truth.
- **`Organization & Org Chart`** owns people, org units, reporting lines, and effective-dated manager scope.
- **`Customization / Metadata`** supplies field definitions, validation rules, and `PlatformSetting` overrides; never owns operational records.
- **`Financial Governance + Project Radiator`** owns budget, EVM rollup, RAG snapshots, radiator scoring. Reads project + assignment + work-evidence; never mutates them.
- **`Help Center`** owns article + tip + feedback + onboarding tour state. Read by anyone authenticated.
- **`Pulse`** owns mood + heatmap. Aggregated reads only — individual entries never surface unredacted outside the entry's owner.
- **`Setup Wizard`** owns the one-time install boundary (`SetupRun` + token). Once admin is created, the wizard self-deactivates.

## Scenario anchors

### Jira activity without formal assignment

- Jira activity enters through `Integrations Hub`.
- `Time & Work Evidence` may store evidence for audit + analytics.
- `Assignment & Workload` is unchanged unless a separate internal workflow approves an assignment.

### Formal assignment without Jira activity

- `Assignment & Workload` remains valid — planned work is authoritative even when no external evidence exists.
- `Time & Work Evidence` may later report missing evidence, but cannot invalidate assignment truth.

### Manager scope changes over time

- `Organization & Org Chart` owns effective-dated reporting lines + manager scope.
- Downstream contexts consume snapshots or events, never redefine the org model.

### Multiple external project links

- A single internal `Project` may carry many `ProjectExternalLink` records (Jira + finance + future ALM tools coexist without changing project identity).

### Matrix visibility vs approval authority

- `Organization & Org Chart` models solid-line + dotted-line relationships.
- `Assignment & Workload` interprets those through policy to decide who may review vs approve.

### Multi-adapter same-provider family

- `Integrations Hub` may host multiple adapters for the same family (M365 directory + Outlook + Teams). Adapter differences must terminate at the anti-corruption layer.

### Slate-based proposal → assignment booking

- `Staffing Desk` produces a slate (`StaffingRequestProposalSlate`) with candidates.
- Approval transitions the slate, then `Assignment & Workload` issues canonical 9-state `ProjectAssignment` rows via `TransitionProjectAssignmentService`.

### Right-to-erasure

- `Identity & Access` flags person for erasure.
- `Audit & Observability` runs D-167 v1 redact-payload across `AuditLog.payload` — PII fields replaced with `<REDACTED>`; hash chain stays intact.
- All other contexts cascade per their soft-delete + archive policy (DM-8 middleware).

### Bank-IT install (Setup Wizard path)

- Operator boots fresh deployment with `CLEAN_INSTALL=true`.
- Visits `/setup`, pastes X-Setup-Token from `docker logs`.
- Wizard runs preflight → migrations → tenant → admin → integrations → monitoring → seed → complete.
- Wizard handles `CREATE DATABASE` + migrations + schema-diff auto-fix + seeding (sole profile `it-company`).
