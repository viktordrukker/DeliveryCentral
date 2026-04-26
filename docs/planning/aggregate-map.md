# DeliveryCentral — Aggregate Map

**Status:** v1.0 · 2026-04-17 · Phase DM deliverable
**Purpose:** name every DDD aggregate in the domain, list its component entities, and forbid cross-aggregate writes. This is the single most load-bearing governance document for the data model: cascade policy, transaction boundaries, RLS scopes, and ownership all derive from it.

---

## Rules of the Map

1. **Writes stay inside an aggregate.** A business operation either (a) mutates one aggregate + its components, or (b) is an orchestration that emits events consumed by other aggregates. A service is **never** allowed to update rows belonging to two different aggregates in one transaction, except via the transactional-outbox pattern.
2. **References across aggregates are by ID only.** Never eagerly load a foreign aggregate's component graph — that is a sign you're about to violate rule #1.
3. **Cascade only within an aggregate.** `onDelete: Cascade` is legal from a root to its own components. Across aggregates it is banned; use `Restrict` or `SetNull`.
4. **The aggregate root owns invariant enforcement.** If an invariant spans multiple rows (e.g. "total assignment % for a person on a day ≤ 100"), it lives in the root's service, behind a `version` optimistic-lock update.
5. **Events are the only cross-aggregate coupling.** `DomainEvent` (DM-7) is written **in the same `$transaction`** as the aggregate mutation; other aggregates react asynchronously.

---

## Aggregate Inventory

### 1. Identity & Access

#### AuthAccount (root)
- `LocalAccount` — credentials, 2FA, MFA state
- `RefreshToken` — session tokens
- `PasswordResetToken`
- **Owns invariants:** password rotation, account lockout, session validity
- **Tenant-scoped:** yes (DM-7.5)
- **Cross-aggregate writes allowed:** emit `DomainEvent` only

#### PrincipalIdentity (root)
- `Person` — canonical identity, lifecycle, contact info
- `Contact` (DM-6) — phone/address/alt-email
- `EmploymentEvent` (DM-6) — hire/terminate/leave/rehire audit chain
- `PersonExternalIdentityLink` — M365 / IdP mapping
- `ExternalAccountLink` — Radius / external account mapping
- **Owns invariants:** employment status transitions, uniqueness of primary email
- **Tenant-scoped:** yes
- **Cross-aggregate writes allowed:** emits `PersonCreated`, `PersonTerminated`, `PersonReinstated`

### 2. Organization

#### Organization (root = `OrgUnit`)
- `OrgUnit` hierarchy (self-referential)
- `Position`
- **Owns invariants:** manager-must-exist, no-cycles-in-hierarchy, valid time range
- **Tenant-scoped:** yes

#### Membership (root = `PersonOrgMembership`)
- `PersonOrgMembership`
- `ReportingLine`
- `PersonResourcePoolMembership`
- **Owns invariants:** at most one primary membership per person at a time; reporting-line non-cyclic
- **Tenant-scoped:** yes (via Person + OrgUnit)
- **Cross-aggregate reads:** Person, OrgUnit, ResourcePool (as IDs)

#### ResourcePool (root)
- `ResourcePool`
- **Owns invariants:** unique `code`
- **Tenant-scoped:** yes

### 3. Project Portfolio

#### Project (root)
- `Project`
- `ProjectExternalLink`
- `ExternalSyncState` (child of `ProjectExternalLink`)
- `ProjectRolePlan`
- `ProjectBudget` (financial subdomain) **← caveat:** `ProjectBudget` is financially-governed; see Financial aggregate. Practically: `Project` cascades `ProjectBudget` delete because Budget doesn't exist without Project, but Budget's approval-state lives in the Financial aggregate.
- `ProjectRagSnapshot`
- `ProjectRisk`
- `ProjectVendorEngagement` (sits across Project ↔ Vendor — treated as a **Project-owned** child; Vendor aggregate only reads it)
- `ProjectRetrospective` (DM-6, 1:1)
- `ProjectTechnology`, `ProjectTag` (DM-6 join tables)
- **Owns invariants:** lifecycle transitions, engagement-model/project-type consistency, manager existence
- **Tenant-scoped:** yes
- **Cross-aggregate writes allowed:** emits `ProjectCreated`, `ProjectStatusChanged`, `ProjectClosed`

#### Client (root)
- `Client`
- **Tenant-scoped:** yes

#### Vendor (root)
- `Vendor`
- `VendorSkillArea` (DM-6 join)
- **Note:** `ProjectVendorEngagement` belongs to `Project` (above), not to `Vendor`. Vendor reads engagements as foreign-aggregate references.
- **Tenant-scoped:** yes

### 4. Staffing

#### ProjectAssignment (root)
- `ProjectAssignment`
- `AssignmentApproval`
- `AssignmentHistory`
- **Owns invariants:** allocation sum ≤ 100% on any valid day for the same Person; approval chain consistency; `version`-guarded
- **Tenant-scoped:** yes (via Project + Person)
- **Cross-aggregate writes allowed:** emits `AssignmentRequested`, `AssignmentApproved`, `AssignmentEnded`

#### StaffingRequest (root)
- `StaffingRequest`
- `StaffingRequestFulfilment`
- **Owns invariants:** `headcountFulfilled ≤ headcountRequired`; fulfilment auto-drives status
- **Tenant-scoped:** yes
- **Cross-aggregate writes:** emits `StaffingRequestFulfilled` → listened by ProjectAssignment

### 5. Time

#### TimesheetWeek (root)
- `TimesheetWeek`
- `TimesheetEntry`
- **Owns invariants:** sum of entries = totalHours; status transition DRAFT→SUBMITTED→APPROVED|REJECTED; overtime hours ≤ policy max
- **Tenant-scoped:** yes
- **Cross-aggregate reads:** ProjectAssignment (for assignmentId), Project, OvertimePolicy

#### LeaveRequest (root)
- `LeaveRequest`
- `LeaveBalance` — component (one per person/year/type)
- **Owns invariants:** entitlement - used - pending ≥ 0
- **Tenant-scoped:** yes

#### Overtime (root = `OvertimePolicy`)
- `OvertimePolicy`
- `OvertimeException`
- **Owns invariants:** max hours per week; exception-date-range non-overlapping per person
- **Tenant-scoped:** yes (via OrgUnit/ResourcePool/Person)

#### PublicHoliday (root, global)
- `PublicHoliday`
- **Tenant-scoped:** no — platform-level reference data (may evolve; re-evaluate at DM-7.5 if tenants need jurisdictional holidays)

#### PeriodLock (root)
- `PeriodLock`
- **Tenant-scoped:** yes

### 6. Financial Governance

#### Financial (root = `ProjectBudget`)
- `ProjectBudget`
- `BudgetApproval` (DM-6)
- **Owns invariants:** approval workflow; `capexBudget + opexBudget` non-negative; `version`-guarded
- **Tenant-scoped:** yes
- **Cross-aggregate note:** `ProjectBudget` is physically FK'd from Project, but its approval workflow is owned here. Project service cannot mutate `BudgetApproval`.

#### PersonCostRate (root)
- `PersonCostRate`
- **Owns invariants:** effective-from ordering per person
- **Tenant-scoped:** yes

#### Currency (DM-6, global)
- `Currency`
- **Tenant-scoped:** no (platform reference)

### 7. Skills

#### Skill (root, dictionary)
- `Skill`
- `PersonSkill` — **child of Skill OR Person?** Treat as an **association entity** owned by **Person** (skills-of-a-person is the query we run 10× more often than people-with-skill).
- **Tenant-scoped:** yes (DM-7.5 converts `Skill.name @unique` to `(tenantId, name)`)

### 8. Cases & Workflow

#### Case (root = `CaseRecord`)
- `CaseRecord`
- `CaseStep`
- `CaseParticipant`
- **Owns invariants:** step sequence per workflow definition; one terminal step; participant-role uniqueness
- **Tenant-scoped:** yes
- **Cross-aggregate writes:** emits `CaseOpened`, `CaseClosed`, `CaseStepCompleted`

#### CaseType (root, dictionary)
- `CaseType`
- **Tenant-scoped:** yes (tenants can have their own case types; platform defaults exist)

#### WorkflowDefinition (root)
- `WorkflowDefinition`
- `WorkflowStateDefinition`
- **Tenant-scoped:** yes

### 9. Observability & Audit

#### Notification (root, DM-7 unification)
- `Notification` (new, unified) — replaces `NotificationRequest` + `InAppNotification`
- `NotificationDelivery`
- `NotificationChannel` (reference data, platform-scoped)
- `NotificationTemplate`
- **Owns invariants:** template/channel consistency; attempt-count ≤ maxAttempts; delivery status monotonic
- **Tenant-scoped:** yes (Notification row); no (Channel/Template are platform reference)

#### DomainEvent (root, DM-7)
- `DomainEvent`
- **Owns invariants:** immutable; append-only; single source of audit truth
- **Tenant-scoped:** yes — `tenantId` column carries originating tenant
- **Access:** `app_platform_admin` (BYPASSRLS) can publish cross-tenant; `app_user` can only read/write tenant-scoped rows.

#### Legacy `AuditLog`, `OutboxEvent`, `EmployeeActivityEvent`
- All retire into `DomainEvent` as views (DM-7-3, DM-7-4).

#### Integration State (platform-scoped)
- `IntegrationSyncState`
- `WorkEvidenceSource`
- `WorkEvidence` + `WorkEvidenceLink`
- `M365DirectoryReconciliationRecord`
- `RadiusReconciliationRecord`
- **Tenant-scoped:** `WorkEvidence` yes; integration reconciliation records are platform-scoped (cross-tenant) by design.

### 10. Configuration

#### Metadata (root = `MetadataDictionary`)
- `MetadataDictionary`
- `MetadataEntry`
- `CustomFieldDefinition`
- `CustomFieldValue` — **polymorphic** via `entityType + entityId`; see §10 of `schema-conventions.md`
- `EntityLayoutDefinition`
- **Tenant-scoped:** yes (except platform defaults)

#### PlatformSetting (root, platform)
- `PlatformSetting` (key/value)
- **Tenant-scoped:** no

#### Tenant (root, DM-7.5)
- `Tenant`
- **Tenant-scoped:** the root definition itself is not; it **defines** the tenant. Only `app_platform_admin` mutates `Tenant` rows.

---

## Forbidden Cross-Aggregate Writes (explicit list)

Each of these has been seen in the codebase or is an obvious temptation. None are legal after DM-1 lands.

| Forbidden | Reason | Correct approach |
|---|---|---|
| `ProjectService` updating `ProjectAssignment.status` | Crosses Project ↔ ProjectAssignment | Emit `ProjectClosed` event; `AssignmentService` listens and calls its own `endAllForProject()` |
| `AssignmentService` updating `TimesheetEntry.assignmentId` on reassignment | Crosses Staffing ↔ Time | Emit `AssignmentEnded`; timesheet service rewrites its own rows |
| `TimesheetService` reading `OvertimePolicy` eagerly inside a write transaction | Crosses Time ↔ Overtime | Cache policy snapshot at submit-time; re-check on approval via service call |
| `HrService` cascading `Person.deletedAt` into `TimesheetWeek` rows | Cross-aggregate cascade | Soft-delete person; timesheet service keeps rows (audit requirement) |
| Direct `prisma.projectBudget.update()` from `ProjectService` | Crosses Project ↔ Financial | Call `BudgetService.requestApproval()`; approval lives in Financial aggregate |
| `NotificationRequest` insert after `assignment.approve()` without `$transaction` | Non-atomic; loses messages on crash | Transactional-outbox via `DomainEvent` (DM-7) |

---

## Tenant Scope Summary

| Aggregate | `tenantId` column on root | RLS enforced |
|---|---|---|
| AuthAccount | yes | yes |
| PrincipalIdentity (Person) | yes | yes |
| Organization (OrgUnit) | yes | yes |
| Membership | inherited from Person + OrgUnit | yes (via parent) |
| ResourcePool | yes | yes |
| Project | yes | yes |
| Client | yes | yes |
| Vendor | yes | yes |
| ProjectAssignment | yes | yes |
| StaffingRequest | yes | yes |
| TimesheetWeek | yes | yes |
| LeaveRequest | yes | yes |
| Overtime | yes | yes |
| PeriodLock | yes | yes |
| Financial (ProjectBudget) | yes | yes |
| PersonCostRate | yes | yes |
| Case (CaseRecord) | yes | yes |
| Notification | yes | yes |
| DomainEvent | yes | yes (BYPASSRLS for workers) |
| Metadata | yes (except defaults) | yes |
| PublicHoliday | no (platform) | n/a |
| Currency | no (platform) | n/a |
| NotificationChannel / Template | no (platform) | n/a |
| PlatformSetting | no (platform) | n/a |
| Tenant | n/a — defines the scope | `app_platform_admin` only |

---

## How to use this document

**Every PR** that touches the schema or a service method that writes to the DB references this file. Reviewers ask: which aggregate does this belong to? Are we crossing a boundary? Is the cascade legal? Is the write in one transaction?

**Any new model** is added to this file in the same PR that adds it to `schema.prisma`. No exceptions.

**Any rename** of an aggregate root or its components is proposed here first.
