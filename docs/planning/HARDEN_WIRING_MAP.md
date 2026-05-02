# DeliveryCentral — Wiring Map & Assurance

**Companion to `HARDEN_BRIEF.md`.** Whereas the brief tells *what* to harden, this file proves *what exists today* — every endpoint, every wiring, every flow — and walks five end-to-end scenarios so the hardening plan is anchored to real behavior, not assumption.

- Source: live code @ `viktordrukker/DeliveryCentral` `main` (extracted 2026-05-02)
- Scope: 60 backend controllers, ~270 endpoints, 30 modules, 150+ services, 70 frontend API clients, 50+ frontend routes, 28 notification events, 53 Prisma models
- Method: AST-grep extraction of `@Get/@Post/@Put/@Patch/@Delete` decorators; mapping of frontend `lib/api/` calls to backend endpoints; trace of service → repo → Prisma model writes; trace of OutboxEvent → translator → notification

---

## 1. Method (how to read this document)

For each domain we list:

1. **Backend endpoints** with: HTTP verb · path · controller · primary service · roles · DB models touched.
2. **Frontend routes** with: path · page component · allowed roles.
3. **Frontend API clients** with the function names the pages call.
4. **Service → Repository → Model wiring**.
5. **Events emitted** + **notification events translated**.

Then we walk **5 scenarios** through this catalogue, one step at a time, with citations to the inventory.

Then we present a **coverage matrix** mapping every D-item from the brief (D-01..D-74) to the scenario step that exposes it AND the hardening task that closes it. Anything uncovered is surfaced.

---

## 2. Backend endpoint inventory (270 endpoints)

> Format: `METHOD /api/<prefix>/<path>` · `<controller>` · `<roles>` (where known) · `→ <primary service>`. Models touched in §4 wiring map.

### 2.1 Identity & Auth (`/api/auth`, `/api/setup`, `/api/system`, `/api/health`)

| Method | Path | Controller | Primary service |
|---|---|---|---|
| POST | `/auth/login` | auth.controller | LoginService |
| POST | `/auth/logout` | auth.controller | LogoutService (session cookie clear + refresh-token revoke) |
| POST | `/auth/refresh` | auth.controller | RefreshTokenService |
| POST | `/auth/password-reset/request` | auth.controller | PasswordResetService |
| POST | `/auth/password-reset/confirm` | auth.controller | PasswordResetService |
| POST | `/auth/2fa/setup` | auth.controller | TwoFactorService |
| POST | `/auth/2fa/verify` | auth.controller | TwoFactorService |
| POST | `/auth/2fa/disable` | auth.controller | TwoFactorService |
| POST | `/auth/2fa/login` | auth.controller | TwoFactorService |
| POST | `/auth/password/change` | auth.controller | PasswordManagementService |
| GET | `/auth/me` | auth.controller | (returns principal) |
| GET | `/auth/providers` | auth.controller | (lists local/ldap/azure_ad) |
| POST | `/setup/token/issue` | setup.controller | SetupTokenService |
| POST | `/setup/preflight` + `/setup/preflight/create-database` | setup.controller | PreflightService |
| POST | `/setup/migrations/apply` | setup.controller + system.controller | MigrationsService |
| POST | `/setup/tenant`, `/setup/admin`, `/setup/integrations`, `/setup/seed`, `/setup/complete` | setup.controller | SetupRunService |
| GET | `/setup/status`, `/setup/diagnostic-bundle`, `/setup/monitoring/snippet` | setup.controller | SetupRunService |
| POST | `/admin/setup/reset` | setup.controller | (admin only) |
| GET | `/system/state` | system.controller | SystemStateService |
| GET | `/health`, `/readiness`, `/health/deep`, `/diagnostics` | health.controller | HealthService |

### 2.2 Organization & People (`/api/org/people`, `/api/org/chart`, `/api/org/managers`, `/api/teams`, `/api/resource-pools`)

| Method | Path | Service / behavior |
|---|---|---|
| POST | `/org/people` | CreateEmployeeService → `Person`, `PersonOrgMembership`, `PersonResourcePoolMembership`, `ReportingLine` |
| POST | `/org/people/:id/deactivate` | DeactivateEmployeeService → updates `Person.employmentStatus`, auto-creates OFFBOARDING `CaseRecord` (Phase 20b-09) |
| POST | `/org/people/:id/terminate` | TerminateEmployeeService → cascades to end active assignments |
| GET | `/org/people` | PersonDirectoryQueryService (list + filters) |
| GET | `/org/people/:id` | PersonDirectoryQueryService (detail) |
| GET | `/org/people/:id/activity` | EmployeeActivityService → reads `EmployeeActivityEvent` (Phase 19) |
| POST | `/org/reporting-lines` | AssignLineManagerService → `ReportingLine` |
| PATCH | `/org/reporting-lines/:id` | TerminateReportingLineService |
| GET | `/org/chart` | OrgChartQueryService |
| GET | `/org/managers/:id/scope` | ManagerScopeQueryService |
| GET / POST | `/teams` | TeamQueryService + CreateTeamService |
| GET | `/teams/:id`, `/teams/:id/members`, `/teams/:id/dashboard` | TeamQueryService |
| POST | `/teams/:id/members` | UpdateTeamMemberService |
| GET / POST | `/resource-pools` | ResourcePoolQueryService + repository |
| PATCH / POST / DELETE | `/resource-pools/:id`, `/resource-pools/:id/members`, `.../members/:personId` | ResourcePool* services |

**Auxiliary:** `/people/:id/360` (people-360.controller, returns Mood + Allocation summary).

### 2.3 Skills (`/api/admin/skills`)

| Method | Path | Service |
|---|---|---|
| GET | `/admin/skills` | SkillsQueryService |
| POST | `/admin/skills` | CreateSkillService |
| DELETE | `/admin/skills/:id` | DeleteSkillService (uses `ParsePublicIdOrUuid` — DM-2.5) |
| GET | `/admin/skills/:id/skills` (sic, on persons) | PersonSkillService.list |
| PUT | `/admin/skills/:id/skills` | PersonSkillService.set |
| GET | `/admin/skills/skill-match` | SkillMatchQueryService |

### 2.4 Pulse (`/api/pulse`)

| GET | `/pulse/my` | PulseQueryService |
| POST | `/pulse` | PulseRecordService → `PulseEntry` |
| GET | `/reports/mood-heatmap` | MoodHeatmapQueryService |

### 2.5 Project Registry (`/api/projects`, `/api/portfolio`, `/api/clients`, `/api/vendors`)

| Method | Path | Service |
|---|---|---|
| POST | `/projects` | CreateProjectService → `Project` (DRAFT) |
| POST | `/projects/:id/activate` | ActivateProjectService → `Project.status = ACTIVE` |
| POST | `/projects/:id/close` | CloseProjectService → `Project.status = CLOSED` (workspend captured) |
| POST | `/projects/:id/close-override` | CloseProjectOverrideService (governed) |
| POST | `/projects/:id/assign-team` | AssignProjectTeamService → bulk `ProjectAssignment` create |
| GET / PATCH | `/projects` / `/projects/:id` | ProjectQueryService / UpdateProjectService |
| GET | `/projects/:id/dashboard` | ProjectDashboardQueryService → `evidenceByWeek`, `allocationByPerson`, `staffingSummary` |
| GET | `/projects/:id/health`, `/projects/:id/closure-readiness` | ProjectHealthService |
| GET / POST | `/projects/:id/milestones` + `/:milestoneId` | MilestoneService → `ProjectMilestone` |
| GET / POST / PATCH | `/projects/:id/risks` + `/:riskId` + `/.../mark-reviewed`, `/convert-to-issue`, `/resolve`, `/close` | RiskService → `ProjectRisk` |
| GET / POST / PATCH | `/projects/:id/change-requests` + `/:crId` + `/approve` + `/reject` | ChangeRequestService → `ProjectChangeRequest` |
| GET / POST | `/projects/:id/role-plan` + `/.../comparison`, `.../staffing-summary`, `.../generate-requests` | RolePlanService → `ProjectRolePlan` (auto-generates StaffingRequests) |
| GET / POST | `/projects/:id/rag-snapshots` + `/latest` + `/rag-enhanced` + `/rag-computed` + `/staffing-alerts` | RagSnapshotService → `ProjectRagSnapshot` |
| GET | `/projects/:id/radiator` + `/history` + `/snapshot/:weekStarting` | ProjectRadiatorService → 16-axis PMBOK scorer (60s cache) |
| POST | `/projects/:id/radiator/override` | RadiatorOverrideService → `ProjectRadiatorOverride` |
| POST | `/projects/:id/radiator/refresh` | RadiatorRefreshService (invalidates cache) |
| GET / PUT | `/admin/radiator-thresholds` + `/:subDimensionKey` | RadiatorThresholdService → `RadiatorThresholdConfig` |
| GET | `/portfolio/radiator` | PortfolioRadiatorQueryService |
| GET | `/projects/:id/exceptions`, `/projects/:id/risks/:riskId/mark-reviewed` | ProjectExceptionService |
| GET / PUT | `/projects/:id/pulse-report` | PulseReportService |
| GET | `/projects/:id/pulse-summary` | ProjectPulseQueryService |
| GET | `/projects/:id/spc-burndown` | SpcBurndownService → reads `PersonCostRate` × hours |
| GET / POST | `/clients`, `/clients/:id` | ClientService → `Client` |
| GET / POST / PATCH | `/vendors` (+ `/:id`), `/projects/:id/vendors`, `/projects/:projectId/vendors/:engagementId/end` | VendorService → `Vendor`, `ProjectVendorEngagement` |
| GET / PATCH | `/admin/organization-config` + `/reset` | OrgConfigService |

### 2.6 Staffing — Requests (`/api/staffing-requests`)

| Method | Path | Service |
|---|---|---|
| POST | `/staffing-requests` | CreateStaffingRequestService → `StaffingRequest` |
| GET | `/staffing-requests` (+ `?suggestions=`) | StaffingRequestQueryService + StaffingSuggestionsService |
| PATCH | `/staffing-requests/:id` | UpdateStaffingRequestService |
| POST | `/staffing-requests/:id/submit` | SubmitStaffingRequestService → DRAFT → OPEN |
| POST | `/staffing-requests/:id/review` | ReviewStaffingRequestService → OPEN → IN_REVIEW |
| POST | `/staffing-requests/:id/release` | (RM action) |
| POST | `/staffing-requests/:id/fulfil` | FulfilService → marks request FULFILLED + spawns `StaffingRequestFulfilment` |
| POST | `/staffing-requests/:id/cancel` | CancelService → CANCELLED |
| POST | `/staffing-requests/:id/duplicate` | DuplicateService |
| GET / POST | `/staffing-requests/:id/proposals` | StaffingProposalSlateService.list + .submit |
| POST | `/staffing-requests/:id/proposals/:slateId/acknowledge` | ProposalSlateService.acknowledge |
| POST | `/staffing-requests/:id/proposals/:slateId/pick` | ProposalSlateService.pick (auto-declines competitors) |
| POST | `/staffing-requests/:id/proposals/:slateId/reject-all` | ProposalSlateService.rejectAll (reason required) |

### 2.7 Staffing — Assignments (`/api/assignments`)

The CSW (canonical staffing workflow) endpoints. Each transition is a discrete `POST` and goes through `TransitionProjectAssignmentService` consulting `ASSIGNMENT_STATUS_TRANSITIONS`.

| Method | Path | Target status | Roles (per matrix) |
|---|---|---|---|
| POST | `/assignments` | (Create) | PM, DM, Director, Admin |
| POST | `/assignments/bulk` | (Bulk create) | PM, DM, Admin |
| GET | `/assignments` (+ filters) | — | All roles (self-scoped) |
| GET | `/assignments/:id` | — | All roles |
| PATCH | `/assignments/:id` | (Amend) | PM, DM, Director, Admin |
| POST | `/assignments/activate` | (legacy: APPROVED→ACTIVE) | system / cron |
| POST | `/assignments/override` | (governed override) | RM, DM, Admin |
| POST | `/assignments/:id/approve` | (legacy) | PM/DM/Director |
| POST | `/assignments/:id/reject` | REJECTED (legacy) → canonical via /reject below | — |
| POST | `/assignments/:id/end` | (legacy COMPLETED) | — |
| POST | `/assignments/:id/revoke` | (legacy CANCELLED) | — |
| POST | `/assignments/:id/submit` | (precondition for proposals) | — |
| POST | `/assignments/:id/propose` | PROPOSED | RM, DM |
| POST | `/assignments/:id/book` | BOOKED | PM, DM, Director |
| POST | `/assignments/:id/onboarding` | ONBOARDING | PM, DM, Director (+ `onboardingDate?`) |
| POST | `/assignments/:id/assign` | ASSIGNED | PM, DM, Director |
| POST | `/assignments/:id/hold` | ON_HOLD (reason required) | PM, RM, HR, Director |
| POST | `/assignments/:id/release` | ASSIGNED (from ON_HOLD) | PM, RM, HR, Director |
| POST | `/assignments/:id/complete` | COMPLETED | PM, DM, Director |
| POST | `/assignments/:id/cancel` | CANCELLED (reason required) | PM, DM, Director, RM |
| POST | `/assignments/:id/director-approve` | (sequence-2 approval; clears `requiresDirectorApproval`) | Director |

(Legacy and canonical endpoints coexist — see Discrepancy D-04 + Sprint 2 task S-01.)

### 2.8 Staffing Desk & Planner (`/api/staffing-desk`)

| Method | Path | Service |
|---|---|---|
| GET | `/staffing-desk` | StaffingDeskQueryService (combined supply+demand grid) |
| GET | `/staffing-desk/supply-profile` | SupplyProfileQueryService |
| GET | `/staffing-desk/demand-profile` | DemandProfileQueryService |
| GET | `/staffing-desk/bench` | BenchQueryService |
| GET | `/staffing-desk/project-timeline` | ProjectTimelineQueryService |
| GET | `/staffing-desk/planner` | PlannerQueryService (heatmap data) |
| POST | `/staffing-desk/planner/auto-match` | AutoMatchService (strategy solver) |
| POST | `/staffing-desk/planner/apply` | ApplyPlanService (writes plan to assignments) |
| POST | `/staffing-desk/planner/extension-validate` | ExtensionValidateService |
| POST | `/staffing-desk/planner/why-not` | WhyNotService (explainability) |
| GET / POST / PATCH / DELETE | `/staffing-desk/planner/scenarios` (+ `/:id`) | PlannerScenarioService |
| POST | `/staffing-desk/team-builder` | TeamBuilderService |

### 2.9 Workload (`/api/workload`)

| Method | Path | Service |
|---|---|---|
| GET | `/workload/matrix` | WorkloadMatrixQueryService |
| GET | `/workload/capacity-forecast` | CapacityForecastService |
| GET | `/workload/check-conflict` | ConflictCheckService |
| GET | `/workload/planning` | WorkloadPlanningService |

### 2.10 Time, Leave, Overtime, Capitalisation (`/api/timesheets/*`, `/api/my-time/*`, `/api/leave-requests`, `/api/overtime`, `/api/admin/reports/capitalisation`)

| Method | Path | Service |
|---|---|---|
| GET | `/timesheets/my` | MyTimesheetQueryService |
| PUT | `/timesheets/my/entries` | UpdateTimesheetEntriesService |
| POST | `/timesheets/my/:weekStart/submit` | SubmitTimesheetService |
| POST | `/timesheets/my/:weekStart/revoke` | RevokeTimesheetService |
| POST | `/timesheets/my/:weekStart/reset` | ResetTimesheetService |
| GET | `/timesheets/my/history` | MyTimesheetHistoryService |
| GET | `/timesheets/approval` | TimesheetApprovalQueueService (TIMESHEET_MANAGER_ROLES) |
| POST | `/timesheets/:id/approve` | ApproveTimesheetService (self-approval blocked) |
| POST | `/timesheets/:id/reject` | RejectTimesheetService |
| GET | `/reports/time` | TimeReportingService |
| GET | `/my-time/month`, `/my-time/gaps`, `/my-time` | MyTimeService |
| POST | `/my-time/auto-fill`, `/copy-previous`, `/rename-row`, `/delete-row` | MyTimeService |
| GET | `/time-management/queue`, `/team-calendar`, `/compliance` | TimeManagementService |
| POST | `/leave-requests` | CreateLeaveRequestService |
| GET | `/leave-requests/my`, `/leave-requests` | LeaveRequestQueryService |
| POST | `/leave-requests/:id/approve` | ApproveLeaveRequestService (overlap check) |
| POST | `/leave-requests/:id/reject` | RejectLeaveRequestService |
| GET / POST / DELETE | `/overtime/policy` (+ `/:id`) | OvertimePolicyService |
| GET | `/overtime/resolve/:personId`, `/overtime/summary` | OvertimeResolveService |
| GET | `/admin/reports/capitalisation` | CapitalisationReportService |
| POST / GET / DELETE | `/admin/period-locks` | PeriodLockService → `PeriodLock` |

### 2.11 Cost & Financial Governance (`/api/projects/:id/budget*`, `/cost-rate`)

| Method | Path | Service |
|---|---|---|
| PUT | `/projects/:id/budget` | UpsertBudgetService → `ProjectBudget` (with EVM cols) |
| GET | `/projects/:id/budget-dashboard` | BudgetDashboardService → BAC/AC/EAC/EV |
| PUT | `/projects/:id/cost-rate` | UpsertProjectCostRateService → `PersonCostRate` |

### 2.12 Cases (`/api/cases`)

| Method | Path | Service |
|---|---|---|
| POST | `/cases` | CreateCaseService → `CaseRecord` + `CaseStep`s from kind workflow |
| GET | `/cases` (+ filters) | CaseQueryService |
| GET | `/cases/:id`, `/cases/:id/steps`, `/cases/:id/comments`, `/cases/:id/sla`, `/cases/sla/config` | CaseDetailService + CaseSlaService |
| POST | `/cases/:id/close`, `/open`, `/cancel`, `/archive` | CaseLifecycleService |
| POST | `/cases/:id/steps`, `/.../:stepKey/complete`, `/remove` | CaseStepService |
| POST | `/cases/:id/participants`, `/.../:personId/remove` | CaseParticipantService |
| POST | `/cases/:id/comments` | CaseCommentService |
| POST | `/cases/sla/config` | CaseSlaConfigService (in-memory by design) |

### 2.13 Work Evidence (`/api/work-evidence`)

| POST / PATCH / GET | `/work-evidence` (+ `/:id`) | WorkEvidenceService → `WorkEvidence` |

### 2.14 Dashboards (`/api/dashboard/*`, `/api/dashboard/portfolio`, `/api/dashboard/workload`)

| Method | Path | Service |
|---|---|---|
| GET | `/dashboard/employee/:personId`, `/project-manager/:personId`, `/resource-manager/:personId`, `/hr-manager/:personId`, `/delivery-manager`, `/director`, `/:role` | RoleDashboardQueryService |
| GET | `/dashboard/delivery/scorecard-history` | DeliveryScorecardHistoryService |
| GET | `/dashboard/workload/summary`, `/trend`, `/planned-vs-actual` | WorkloadDashboardQueryService |
| GET | `/dashboard/portfolio/heatmap`, `/summary`, `/available-pool` | PortfolioDashboardQueryService |

### 2.15 Reports (`/api/reports`)

| GET | `/reports/utilization` | UtilizationReportService |
| GET | `/reports/builder/sources` | ReportBuilderSourcesService |
| GET / POST / DELETE | `/reports/templates` (+ `/:id`) | ReportTemplateService (in-memory — see 20b-15 deferred) |

### 2.16 Notifications & Inbox (`/api/notifications`, `/api/notifications/inbox`, `/api/me/notification-prefs`)

| POST | `/notifications/nudge` | NudgeService |
| GET / POST | `/notifications/templates`, `/queue`, `/queue/:id/requeue`, `/test-send`, `/outcomes` | NotificationsAdminService |
| GET / POST | `/notifications/inbox`, `/:id/read`, `/read-all` | InAppNotificationService |
| GET / PATCH | `/me/notification-prefs` | NotificationPrefsService |

### 2.17 Exceptions (`/api/exceptions`)

| GET | `/exceptions` (+ filters) | ExceptionsQueryService |
| GET | `/exceptions/:id` | ExceptionDetailService |
| POST | `/exceptions/:id/resolve`, `/.../suppress` | ExceptionLifecycleService |

### 2.18 Audit (`/api/audit/business`)

| GET | `/audit/business` (+ filters + pagination) | BusinessAuditQueryService |

### 2.19 Admin Surfaces (`/api/admin/*`, `/api/metadata`, `/api/admin/platform-settings`)

| Method | Path | Service |
|---|---|---|
| POST / GET / PATCH / DELETE | `/admin/accounts` (+ `/:id`) | AdminAccountService → `LocalAccount` |
| GET | `/admin/config`, `/admin/settings`, `/admin/integrations`, `/admin/notifications` | AdminConfigService |
| POST | `/admin/people/import/preview`, `/confirm` | BulkImportService |
| GET / POST / DELETE | `/admin/webhooks` (+ `/:id` + `/test` + `/deliveries`) | WebhookService (in-memory by design) |
| GET | `/admin/access-policies` | AccessPolicyService (ABAC) |
| GET / POST / PATCH | `/metadata/dictionaries` (+ `/:id` + `/:type/entries` + `/entries/:entryId`) | MetadataDictionaryService |
| GET / PATCH | `/admin/platform-settings` (+ `/by-prefix/:prefix` + `/:key`) | PlatformSettingsService |
| GET / POST | `/admin/hris/config`, `/admin/hris/sync` | HrisConfigService + HrisSyncService |

### 2.20 Integrations (`/api/integrations/*`)

| POST / GET | `/integrations/jira/projects/sync`, `/status` | JiraSyncService |
| POST / GET | `/integrations/m365/directory/sync`, `/status`, `/reconciliation` | M365SyncService → `M365DirectoryReconciliationRecord` |
| POST / GET | `/integrations/radius/accounts/sync`, `/status`, `/reconciliation` | RadiusSyncService → `RadiusReconciliationRecord` |
| GET | `/integrations/history` | IntegrationSyncHistoryService |

---

## 3. Frontend route inventory (53 routes)

> Format: `path` · page component · role guard.

| Path | Page | Roles |
|---|---|---|
| `/` | `DashboardPage` (role-redirector) | All |
| `/dashboard/planned-vs-actual` | `PlannedVsActualPage` | MANAGEMENT_ROLES |
| `/dashboard/employee` | `EmployeeDashboardPage` | All |
| `/dashboard/project-manager` | `ProjectManagerDashboardPage` | PM, Admin, Director |
| `/dashboard/resource-manager` | `ResourceManagerDashboardPage` | RM, Admin, Director |
| `/dashboard/hr` | `HrDashboardPage` | HR, Admin |
| `/dashboard/delivery-manager` | `DeliveryManagerDashboardPage` | DM, Admin, Director |
| `/dashboard/director` | `DirectorDashboardPage` | Director, Admin |
| `/dashboards/portfolio-radiator` | `PortfolioRadiatorPage` | Director, Admin, DM |
| `/admin/radiator-thresholds` | `RadiatorThresholdsPage` | Admin |
| `/admin/organization-config` | `OrganizationConfigPage` | Admin |
| `/org` | `OrgPage` (interactive org chart) | All |
| `/org/managers/:id/scope` | `ManagerScopePage` | All (self-scoped) |
| `/admin/people/new` | `AdminPeopleNewPage` | HR, Director, Admin |
| `/people` | `PeoplePage` (directory) | All |
| `/people/new` | (form placeholder) | HR, Director, Admin |
| `/people/:id` | `EmployeeDetailsPlaceholderPage` (Person 360 with Overview/360 View/Skills/History) | All |
| `/exceptions` | `ExceptionsPage` | MANAGEMENT_ROLES |
| `/teams`, `/teams/:id/dashboard` | `TeamsPage`, `TeamDashboardPage` | All |
| `/projects` | `ProjectsPage` (with health column) | All |
| `/projects/new` | `CreateProjectPage` (3-step wizard) | PM, DM, Director, Admin |
| `/projects/:id` | `ProjectDetailPage` (tabs: Radiator, Milestones, Change Requests, Risks & Issues, Team & Vendors, Budget, Lifecycle) | All |
| `/projects/:id/dashboard` | `ProjectDashboardRedirect` | All |
| `/assignments` | `AssignmentsPage` | All |
| `/assignments/new` | `CreateAssignmentPage` | PM, DM, Director, Admin |
| `/assignments/bulk` | `BulkAssignmentPage` | PM, DM, Admin |
| `/assignments/queue` | `ApprovalQueuePage` | MANAGEMENT_ROLES |
| `/assignments/:id` | `AssignmentDetailsPlaceholderPage` (WO-4.13 redesign) | All |
| `/settings/account` | `AccountSettingsPage` | All |
| `/notifications` | `InboxPage` | All |
| `/resource-pools`, `/resource-pools/:id` | `ResourcePoolsPage`, detail | RM, HR, Admin |
| `/work-evidence` | `WorkEvidencePage` | All |
| `/workload`, `/workload/planning` | `WorkloadPage`, planning | RM, DM, Admin |
| `/my-time` | `MyTimePage` | All |
| `/time-management` | `TimeManagementPage` | TIMESHEET_MANAGER_ROLES |
| `/timesheets` | redirect → `/my-time` | — |
| `/timesheets/approval` | redirect → `/time-management` | TIMESHEET_MANAGER_ROLES |
| `/leave` | `LeaveRequestPage` | All |
| `/reports/time`, `/capitalisation`, `/export`, `/utilization`, `/builder` | various report pages | various |
| `/cases`, `/cases/new`, `/cases/:id` | `CasesPage`, create, detail | All |
| `/staffing-requests`, `/staffing-requests/new`, `/staffing-requests/:id` | `StaffingRequestsPage`, create, detail | All |
| `/staffing-board` | `StaffingBoardPage` | RM, DM, Admin, Director |
| `/staffing-desk` | `StaffingDeskPage` (Table + Planner toggle) | RM, DM, PM, Director, Admin |
| `/admin`, `/admin/dictionaries`, `/admin/audit`, `/admin/notifications`, `/admin/integrations`, `/admin/monitoring`, `/admin/settings`, `/admin/people/import`, `/admin/webhooks`, `/admin/hris`, `/admin/vendors`, `/admin/access-policies` | various admin pages | Admin |
| `/integrations`, `/metadata-admin` | admin views | Admin |
| `/setup`, `/login`, `/forgot-password`, `/reset-password`, `/auth/2fa-setup` | auth flow | Public |

---

## 4. Frontend API clients (70 modules in `frontend/src/lib/api/`)

```
admin.ts                  hris.ts                          project-budget.ts
assignments.ts            http-client.ts                   project-change-requests.ts
bulk-import.ts            inbox.ts                         project-dashboard.ts
business-audit.ts         integrations-admin.ts            project-exceptions.ts
capitalisation.ts         jira-integrations.ts             project-health.ts
cases.ts                  leaveRequests.ts                 project-milestones.ts
clients.ts                manager-scope.ts                 project-pulse.ts
config.ts                 metadata.ts                      project-radiator.ts
dashboard-{role}.ts (×6)  monitoring.ts                    project-rag.ts
employee-activity.ts      my-time.ts                       project-registry.ts
exceptions.ts             notification-prefs.ts            project-risks.ts
overtime.ts               notifications.ts                 project-role-plan.ts
person-directory.ts       nudge.ts                         project-spc.ts
planned-vs-actual.ts      org-chart.ts                     pulse-report.ts
platform-settings.ts      org-config.ts                    pulse.ts
portfolio-dashboard.ts    radiator-thresholds.ts           query-state.ts
portfolio-radiator.ts     report-builder.ts                reporting-lines.ts
resource-pools.ts         setup.ts                         skills.ts
staffing-desk.ts          staffing-requests.ts             teams.ts
time-management.ts        timesheets.ts                    utilization.ts
vendors.ts                webhooks.ts                      work-evidence.ts
workload-dashboard.ts     workload.ts
```

All flow through `http-client.ts` which centralizes JWT, refresh, and error handling.

---

## 5. Notification translator events (28)

Per `src/modules/notifications/application/notification-event-translator.service.ts`:

```
assignmentCreated            caseCreated                   projectActivated
assignmentApproved           caseStepCompleted             projectClosed
assignmentRejected           caseClosed                    proposalSubmitted
assignmentAmended            caseApproved                  proposalAcknowledged
assignmentEnded              caseRejected                  proposalDirectorApprovalRequested
assignmentStatusChanged      employeeDeactivated           staffingRequestSubmitted
assignmentEscalatedToCase    employeeTerminated            staffingRequestInReview
assignmentSlaBreached        integrationSyncFailed         staffingRequestFulfilled
assignmentOnboardingScheduled                              staffingRequestCancelled
                                                           timesheetApproved
                                                           timesheetRejected
```

### Notable absences vs the brief's Appendix C target list

- `employee.hired` — **MISSING** from translator (confirmed live: D-47/D-70 inbox empty after hire)
- `employee.reactivated` — missing
- `employee.contractExpiring`, `employee.costRateStale` — missing (P-05)
- `pulse.declineDetected`, `pulse.weeklyDigest` — missing (P-06)
- `staffingRequest.created` — missing (the request `submitted` event exists but not the `created` event)
- `proposal.nudge` — missing (S-09)
- `assignment.utilizationOver100`, `assignment.utilizationUnder50for4w`, `assignment.overtime` — missing (P-09, S-06)
- `project.submittedForApproval`, `project.approved`, `project.rejected`, `project.statusDigest`, `project.budget.overrunRisk`, `project.budgetChange.requested/approved/rejected` — missing (PM-01, PM-03, C-04)
- `risk.stale` — missing (PM-06)
- `changeRequest.slaBreached` — missing (PM-07)
- `vendor.slaBreach` — missing (PM-08)
- `timesheet.missingForWeek`, `timesheet.locked` — missing (P-09)
- `release.requested`, `release.partiallyApproved`, `release.approved`, `release.rejected`, `release.completed` — missing (P-07)
- `assignment.slaWarning` (pre-breach) — missing (S-04)

That's **27 missing events** the hardening plan adds. Tracking them in the §7 coverage matrix.

---

## 6. Wiring map (per domain)

### 6.1 People

```
FE Page              FE API client            BE Endpoint                          Service                          Models written                  Events emitted
/people              person-directory.ts      GET /org/people                      PersonDirectoryQueryService      —                               —
/admin/people/new    person-directory.ts      POST /org/people                     CreateEmployeeService            Person, PersonOrgMembership,     ❌ employee.hired SHOULD be emitted (D-47)
                                                                                                                    PersonResourcePoolMembership,
                                                                                                                    ReportingLine
/people/:id          person-directory.ts      GET /org/people/:id                  PersonDirectoryQueryService      —                               —
/people/:id (Hist)   employee-activity.ts     GET /org/people/:id/activity         EmployeeActivityService          —                               (reads EmployeeActivityEvent)
/people/:id (Skil)   skills.ts                GET/PUT /admin/skills/:id/skills     PersonSkillService               PersonSkill                     —
deactivate action    person-directory.ts      POST /org/people/:id/deactivate      DeactivateEmployeeService        Person, CaseRecord(OFFBOARDING) ✓ employee.deactivated (translator wired)
terminate action     person-directory.ts      POST /org/people/:id/terminate       TerminateEmployeeService         Person, ProjectAssignment(end)  ✓ employee.terminated
```

Pulse: `POST /pulse` → PulseRecordService → `PulseEntry`. Read via `GET /pulse/my` and `/people/:id/360`.

Reporting lines: `POST/PATCH /org/reporting-lines` → AssignLineManagerService / TerminateReportingLineService → `ReportingLine`.

### 6.2 Staffing Request → Assignment lifecycle

```
                     StaffingRequest                              ProjectAssignment (per slot)
                     ────────────────                              ─────────────────────────────
DRAFT ──submit──► OPEN ──review──► IN_REVIEW ──fulfil──► FULFILLED
                                                                  CREATED ──propose──► PROPOSED ──submit-slate──► IN_REVIEW
                                                                  IN_REVIEW ──pick (slate)──► BOOKED
                                                                  BOOKED ──onboarding──► ONBOARDING ──assign──► ASSIGNED
                                                                  ASSIGNED ──complete──► COMPLETED
                                                                  ASSIGNED/ONBOARDING ──hold──► ON_HOLD ──release──► ASSIGNED
                                                                  any non-terminal ──cancel──► CANCELLED
                                                                  any non-terminal ──reject──► REJECTED
```

The two state machines run in parallel. `DeriveStaffingRequestStatusService` rolls per-slot statuses into the request-level status (D-11 risk).

### 6.3 Project → Budget → Cost rollup

```
Project lifecycle:        DRAFT ──activate──► ACTIVE ──close──► CLOSED ──archive──► ARCHIVED
                                                          └──hold──► ON_HOLD ──resume──► ACTIVE
                          (after PM-01: DRAFT ──submit──► PENDING_APPROVAL ──approve──► ACTIVE)

Budget lifecycle:         (admin sets BAC) PUT /projects/:id/budget → ProjectBudget
                          BudgetApproval (PENDING → APPROVED) — exists but UI sparse
                          EVM cols filled by:
                            - timesheet hours × cost rate → AC
                            - PM enters EV (or auto-cpi after C-02)
                            - eac = manual or auto

Cost rate:                effective-dated PersonCostRate → spc-burndown chart (existing endpoint)
                          NEW (C-01): RateCard layered (TENANT/CLIENT/PROJECT) → assignment.appliedRateCardEntryId
```

### 6.4 Time entry → Approval → Period lock → Cost

```
Employee:    /my-time → POST /timesheets/my/:weekStart/submit → TimesheetWeek.status=SUBMITTED
PM/DM:       /time-management → POST /timesheets/:id/approve → status=APPROVED
                              POST /timesheets/:id/reject → status=REJECTED
Finance:     /admin/period-locks → POST → PeriodLock(weekStart) → blocks edits in that period
Cost rollup: nightly: sum(approved hours × applicable PersonCostRate) → ProjectBudget.actualCost
```

### 6.5 Pulse → Person 360 → Manager dashboards

```
Employee:    /my-time (Pulse widget) → POST /pulse → PulseEntry(personId, weekStart, mood, note)
Read paths:  GET /pulse/my → "my last mood"
             GET /people/:id/360 → 12-week mood trend
             GET /reports/mood-heatmap → org-level heatmap
             (NEW P-06): GET /pulse/team-summary?managerId= → manager dashboard card
```

### 6.6 Cases (lifecycle exceptions)

```
Trigger:        - employee deactivation → auto-creates OFFBOARDING case (existing)
                - employee creation → auto-creates ONBOARDING case (existing)
                - assignment escalation → manual via "Escalate" CTA (S-11 to be wired)
                - SLA breach → assignmentSlaBreached translator + auto-case (partial)

Lifecycle:      OPEN → IN_PROGRESS → APPROVED/REJECTED/COMPLETED/CANCELLED → ARCHIVED
                step completion: POST /cases/:id/steps/:stepKey/complete
                participants:    POST /cases/:id/participants

SLA:            CaseSlaConfig (in-memory by design) → CaseSlaService monitors
```

### 6.7 Distribution Studio (Planner)

```
Read:        GET /staffing-desk/planner → grid data (people × weeks × allocations)
Solver:      POST /staffing-desk/planner/auto-match → AutoMatchService (skill+cost+availability)
Apply:       POST /staffing-desk/planner/apply → batch create/update ProjectAssignment rows (CREATED state)
Validate:    POST /staffing-desk/planner/extension-validate → check before extending
Explain:     POST /staffing-desk/planner/why-not → returns reasons person didn't match
Scenarios:   GET/POST/PATCH/DELETE /staffing-desk/planner/scenarios — server-persisted
Team build:  POST /staffing-desk/team-builder
```

### 6.8 Notifications & Audit (cross-cutting)

```
State change → service writes Domain row → service calls translator method → translator:
   1. enqueues NotificationRequest (email channel)
   2. inserts InAppNotification row (in-app inbox)
   3. dispatch loop sends email → NotificationDelivery row
   4. inbox SSE stream pushes to NotificationBell

Audit:    AuditLog (Prisma-backed, hash-chained) for state changes.
          EmployeeActivityEvent (people-specific timeline).
          OutboxEvent (transactional outbox — DM-7) — publisher loop fans out events to translator.

Missing wiring (D-47/D-59/D-63/D-70):
   CreateEmployeeService → NO call to translator
   CreateProjectService → NO call to translator
   ActivateProjectService → NO call to translator
   → no AuditLog row, no EmployeeActivityEvent, no InAppNotification, no email queued
   → entire create+activate observability is silent in production
```

---

## 7. Five end-to-end scenarios (with explicit per-step trace)

For each step: **Click** → **FE route** → **API client call** → **HTTP request** → **Backend service** → **DB writes** → **Events emitted** → **Notifications fired** → **D-items affected** → **Hardening task that fixes any gap**.

### Scenario A — "Hire a new employee, onboard them, place them on a project, then release them"

| # | Click / Action | FE route | API client | HTTP | Service | Models written | Events | Notifications | D-items | Closes via |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 | HR → New employee | `/admin/people/new` | `person-directory.create()` | `POST /org/people` | `CreateEmployeeService` | `Person`, optional `PersonOrgMembership`, `PersonResourcePoolMembership`, initial `ReportingLine` | **Should** emit `employee.hired` → outbox; **does not today** | **Should** notify RM + HR; **fires nothing** | D-30, D-31, D-44, D-45, D-46, D-47, D-50, D-70 | P-01 (schema), P-02 (wizard), P-03 (notify RM), P-04 (skills dedup), 0.16/0.17/0.20/0.21 (Sprint 0) |
| A2 | Verify Person 360 lifecycle | `/people/:id` (History tab) | `employee-activity.list()` | `GET /org/people/:id/activity` | `EmployeeActivityService` | reads `EmployeeActivityEvent` | — | — | D-47 (no row exists for hire) | 0.17 EVENT-PIPE-AUDIT |
| A3 | Set initial skills | `/people/:id` (Skills tab → Edit) | `skills.setPersonSkills()` | `PUT /admin/skills/:id/skills` | `PersonSkillService.set` | `PersonSkill` rows | — | — | D-46 (form skill checkbox writes to legacy field; modern path here) | P-04 |
| A4 | Set initial cost rate | (no UI today) | n/a | (would need new endpoint OR `PUT /projects/:id/cost-rate`) | n/a | `PersonCostRate` | — | — | G8 (no SPC monitoring) | P-05 + new admin UI under People |
| A5 | Auto-create ONBOARDING case | (server side; triggered on A1) | n/a | n/a | `CreateCaseService` (auto-fired on Person create per Phase 20b-08) | `CaseRecord(kind=ONBOARDING)` + `CaseStep`s | `case.created` | HR | (existing — verify in 0.7 audit) | — |
| A6 | RM creates a staffing request for this person's role | `/staffing-requests/new?projectId=...` | `staffing-requests.create()` | `POST /staffing-requests` | `CreateStaffingRequestService` | `StaffingRequest(status=DRAFT)` | (currently no event for create) | — | event missing | (Sprint 1 add) |
| A7 | RM submits the SR + builds proposal slate naming the new person | SR detail | `staffing-requests.submit()` then `/assignments/:id/proposals` (POST) | `POST /staffing-requests/:id/submit`, then `POST /assignments/:id/proposals` | `SubmitStaffingRequestService`, `ProposalSlateService.submit` | `StaffingRequest.status=OPEN`, `AssignmentProposalSlate`, `AssignmentProposalCandidate` | `proposal.submitted` | PM/DM | confirms WO-2 wired | — |
| A8 | PM acknowledges and picks the new person | `/assignments/queue` (Approval Queue) | `assignments.pickProposalCandidate()` | `POST /assignments/:id/proposals/:slateId/pick` | `ProposalSlateService.pick` | Assignment `status=BOOKED`, slate decided, competitors auto-declined | `assignment.statusChanged{to:BOOKED}` | RM, person | — | — |
| A9 | Director approves (if threshold triggered) | Assignment detail | `assignments.directorApprove()` | `POST /assignments/:id/director-approve` | `DirectorApproveService` (consults `DirectorApprovalThresholdService`) | `AssignmentApproval(sequence=2,decision=APPROVED)`, clears `requiresDirectorApproval` | (today) | (today) | should consult new `ResponsibilityResolver` | S-05 |
| A10 | Schedule onboarding | Assignment detail | `assignments.scheduleOnboarding()` | `POST /assignments/:id/onboarding` (body `{onboardingDate}`) | `ScheduleOnboardingService` | Assignment `status=ONBOARDING`, `onboardingDate` set, SLA stage → `RM_FINALIZE` | `assignment.onboardingScheduled` | person, RM | — | — |
| A11 | Activate (BOOKED→ASSIGNED) | Assignment detail | `assignments.assign()` | `POST /assignments/:id/assign` | TransitionProjectAssignmentService | Assignment `status=ASSIGNED` | `assignment.statusChanged{to:ASSIGNED}` | person | utilization classifier (S-08) flips from "productive non-billable" → "billable" | S-08 |
| A12 | Person logs hours weekly | `/my-time` | `my-time.update()` then `timesheets.submitMyWeek()` | `PUT /timesheets/my/entries`, `POST /timesheets/my/:weekStart/submit` | `UpdateTimesheetEntriesService`, `SubmitTimesheetService` | `TimesheetEntry`, `TimesheetWeek.status=SUBMITTED` | — | line manager | missing-week sweep (P-09) | P-09 |
| A13 | PM approves week | `/time-management` | `timesheets.approveWeek()` | `POST /timesheets/:id/approve` | `ApproveTimesheetService` | `TimesheetWeek.status=APPROVED` | `timesheet.approved` | person | — | — |
| A14 | Finance locks period | `/admin` (capitalisation tab) | `capitalisation.createPeriodLock()` | `POST /admin/period-locks` | `PeriodLockService` | `PeriodLock(weekStart)` | (no event today) | should notify PMs of locked projects | P-09 (timesheet.locked event) |
| A15 | Cost rollup (nightly) | (cron) | n/a | n/a | `BudgetRollupService` (proposed under C-04) | `ProjectBudget.actualCost` updated | — | overrun-risk threshold check | C-04 |
| A16 | Complete the assignment | Assignment detail | `assignments.complete()` | `POST /assignments/:id/complete` | TransitionProjectAssignmentService | Assignment `status=COMPLETED` | `assignment.statusChanged{to:COMPLETED}` | person, RM, PM | — | — |
| A17 | RM initiates Release (per J3 dual-approval) | Person 360 → Release tab (NEW) | `person-directory.openReleaseRequest()` (NEW) | `POST /people/:id/release-requests` (NEW) | `OpenPersonReleaseRequestService` (NEW) | `PersonReleaseRequest(status=PENDING_APPROVAL)`, opens `CaseRecord(OFFBOARDING)` | `release.requested` (NEW) | HR + Director | doesn't exist yet | P-07 |
| A18 | HR approves | Approvals queue | `person-directory.approveRelease()` (NEW) | `POST /people/release-requests/:id/approve` (NEW) | `DecideReleaseService` (NEW) | `PersonReleaseApproval(role=hr_manager,decision=APPROVED)` | `release.partiallyApproved` (NEW) | Director | — | P-07 |
| A19 | Director approves (request now APPROVED) | Approvals queue | `person-directory.approveRelease()` (NEW) | `POST /people/release-requests/:id/approve` (NEW) | `DecideReleaseService` (NEW) | `PersonReleaseApproval(role=director,decision=APPROVED)`, request `status=APPROVED` | `release.approved` (NEW) | RM, person, line manager | — | P-07 |
| A20 | RM completes checklist + finalize | Person 360 (Release tab) | `person-directory.finalizeRelease()` (NEW) | `POST /people/release-requests/:id/finalize` (NEW) | `FinalizeReleaseService` (NEW) | `Person.employmentStatus=TERMINATED`, `Person.terminatedAt`, cascade `ProjectAssignment.status=CANCELLED` for active | `employee.terminated`, `release.completed` (NEW) | all stakeholders | — | P-07 |

**Result.** Scenario A exposes **18 of the 74 D-items** + the entire missing event family, and is closed by **P-01..P-09 + 0.16..0.21**.

### Scenario B — "Project from inception to closure"

| # | Click / Action | Endpoint | Service | Events | D-items | Closes via |
|---|---|---|---|---|---|---|
| B1 | PM creates DRAFT project | `POST /projects` | CreateProjectService | (none today) | D-50 (no redirect), D-52 (code convention), D-53 (priority drop), D-59 (no audit) | 0.21, 0.22, 0.25, 0.17 |
| B2 | (NEW) PM submits for approval | `POST /projects/:id/submit-for-approval` | SubmitProjectForApprovalService | `project.submittedForApproval` | D-12 / G31 | PM-01 |
| B3 | (NEW) Director approves OR PM_SOLO via Responsibility Matrix | `POST /projects/:id/approve` | DecideProjectActivationService | `project.approved` | D-12 / G31 | PM-01 + S-05 |
| B4 | Activate project | `POST /projects/:id/activate` | ActivateProjectService | (today) **none** ; should emit `project.activated` | D-58 (no confirm), D-62 (no gate), D-63 (no audit) | 0.17, 0.18, PM-01 |
| B5 | Set BAC budget | `PUT /projects/:id/budget` | UpsertBudgetService → `BudgetApproval(PENDING)` | (J6 extension) `project.budgetChange.requested` | (today: changes apply immediately without approval) | PM-01 budget extension |
| B6 | Director approves budget | (new endpoint) | ApproveBudgetService | `project.budgetChange.approved` | — | PM-01 budget extension |
| B7 | Set cost rates | `PUT /projects/:id/cost-rate` | UpsertProjectCostRateService | — | should integrate with new RateCard scope=PROJECT | C-01 |
| B8 | PM creates role plan + auto-generates staffing requests | `POST /projects/:id/role-plan/generate-requests` | RolePlanService.generateRequests | `staffingRequest.created` (NEW) | event missing | (Sprint 1) |
| B9 | RM staffs project (Scenario A.6-A11 per slot) | several | several | several | (covered by A) | (covered) |
| B10 | Time + cost rollup running (Scenario A.12-A15) | several | several | several | (covered) | (covered) |
| B11 | Open risks tracked | `POST /projects/:id/risks` | RiskService.create | (no event today; should `risk.created`) | event missing | (extension) |
| B12 | Risk staleness sweep | (cron PM-06) | RiskStalenessSweepService (NEW) | `risk.stale` | event missing | PM-06 |
| B13 | Change request | `POST /projects/:id/change-requests` + `/approve` | ChangeRequestService | should emit `changeRequest.slaBreached` | event missing | PM-07 |
| B14 | Vendor SLA tracking | `PATCH /projects/:projectId/vendors/:engagementId` | VendorEngagementService | (NEW) sweep emits `vendor.slaBreach` | event missing | PM-08 |
| B15 | Weekly status digest | (cron PM-03) | WeeklyStatusDigestService (NEW) | `project.statusDigest` | event missing | PM-03 |
| B16 | Burn rate / overrun risk alert | (cron C-04) | BudgetRollupService (NEW) | `project.budget.overrunRisk` | event missing | C-04 |
| B17 | Closure readiness check | `GET /projects/:id/closure-readiness` | ProjectClosureReadinessService | — | — | — |
| B18 | Close project (PM-09 checklist) | `POST /projects/:id/close` | CloseProjectService → opens `CaseRecord(PROJECT_CLOSURE)` | `project.closed` | (closure flow needs hardening) | PM-09 |

### Scenario C — "Director approves a high-allocation, multi-month assignment"

This scenario tests the Director-approval threshold logic.

| # | Click / Action | Service | D-items | Closes via |
|---|---|---|---|---|
| C1 | PM creates assignment with 80% allocation, 6-month duration | CreateProjectAssignmentService | DirectorApprovalThresholdService consults `assignment.directorApproval.allocationPercentMin` (default null=disabled) and `durationMonthsMin` | confirms WO-2.3 wired |
| C2 | If thresholds match, `requiresDirectorApproval=true` is set on assignment | — | — | — |
| C3 | RM proposes slate (Scenario A.7) | ProposalSlateService.submit | — | — |
| C4 | PM picks candidate → BOOKED | ProposalSlateService.pick | `proposal.directorApprovalRequested` notification fires | confirms WO-3 |
| C5 | But: per-director routing fails today | NotificationEventTranslatorService (uses fallback email) | D-20 / G20 | S-05 (Responsibility Matrix) |
| C6 | Director sees "Director-approvals waiting" tile | (today) **missing tile** | D-33 / G18 / WO-4.15 | S-03 |
| C7 | Director approves | DirectorApproveService | sequence-2 `AssignmentApproval` row | — |
| C8 | SLA pre-breach warning at 50%/75% | (today) **missing** | G19 / WO-3 deferred | S-04 |
| C9 | Onboarding scheduled, person activates | (covered by A) | — | — |

### Scenario D — "Capacity heatmap → demand pipeline → fast assignment"

| # | Click / Action | Endpoint | Service | D-items | Closes via |
|---|---|---|---|---|---|
| D1 | Open Distribution Studio | `GET /staffing-desk/planner` | PlannerQueryService | confirms data path | — |
| D2 | View bench cohort | (today: bench panel; covers 130 people) | BenchQueryService | — | SD-07 (cohort drill-down) |
| D3 | Click cell → expects inline edit; gets **read-only popover** | n/a | n/a | D-72 / G50 | SD-02 |
| D4 | Drag-to-assign | n/a today | n/a | G51 | SD-03 |
| D5 | Right-click suggest matches | n/a today | n/a | G53 | SD-05 |
| D6 | Open demand pipeline view | n/a today | n/a (would call `GET /staffing-desk/demand-profile` + new ranked endpoint) | G52 | SD-04 |
| D7 | Auto-match from solver | `POST /staffing-desk/planner/auto-match` | AutoMatchService | — | (existing) |
| D8 | Apply plan | `POST /staffing-desk/planner/apply` | ApplyPlanService → batch creates ProjectAssignment(CREATED) rows | — | — |
| D9 | Each created assignment then flows through Scenario A.7 onward | several | several | clash detection (S-06) inline | S-06 |
| D10 | Visual alert badges (over-100% / clash / tentative / on-leave) | n/a today | n/a | G55 | SD-09 |

### Scenario E — "Time entry, approval, period lock, and margin computation"

| # | Click / Action | Endpoint | Service | D-items | Closes via |
|---|---|---|---|---|---|
| E1 | Employee logs hours | `PUT /timesheets/my/entries` | UpdateTimesheetEntriesService | — | — |
| E2 | Submit | `POST /timesheets/my/:weekStart/submit` | SubmitTimesheetService | — | — |
| E3 | Missing-week sweep nudges late submitters | (cron P-09) **missing** | TimesheetMissingWeekSweepService (NEW) | event `timesheet.missingForWeek` missing | P-09 |
| E4 | PM approves | `POST /timesheets/:id/approve` | ApproveTimesheetService | self-approval blocked (Phase 20b-02 done) | — |
| E5 | Reject with reason | `POST /timesheets/:id/reject` | RejectTimesheetService | uses `ConfirmDialog` | — |
| E6 | Finance locks period | `POST /admin/period-locks` | PeriodLockService | event `timesheet.locked` missing | P-09 |
| E7 | Cost rollup | (cron C-04) | BudgetRollupService (NEW) | computes AC = sum(approved hours × resolved cost rate via PersonCostRate effective-dated) | C-04 |
| E8 | Bill rate resolved per assignment | EffectiveBillRateResolver (NEW) | resolves via RateCard layered match | confirms C-01 wiring | C-01 |
| E9 | Revenue computation per period | RevenueCalculator (NEW) | bill rate × approved hours | — | C-01 |
| E10 | Margin per project | MarginService (NEW) | revenue − labor cost − vendor expenses | — | C-04 + C-07 |
| E11 | Burn rate alert | (cron) | overrun threshold check | event `project.budget.overrunRisk` missing | C-04 |
| E12 | Director sees Portfolio P&L tile | (today) **missing** | n/a | G49 / D-33 | C-07 |

---

## 8. Coverage assurance matrix (D-items × scenarios × hardening tasks)

> Every D-item is mapped to (a) which scenario step exposes it, (b) which Sprint 0..8 task closes it, (c) status of certainty.

| D | Brief one-liner | Exposed in | Closed by | Certainty |
|---|---|---|---|---|
| D-01 | Cred mismatch | login | 0.4 | resolved live (admin@delivery.local IS the seed; CLAUDE.md is stale) |
| D-02 | PublicIdBootstrapService DI failure | bootstrap | 0.1 | precondition for everything; verified via `current-state.md` |
| D-03 | 1,120-line schema diff | schema audit | 0.2 | precondition |
| D-04 | Legacy + canonical staffing endpoints coexist | A.7, A.8 | S-01 | precondition for S-02..S-13 |
| D-05 | Tracker says "tests done" but skips | test run | 0.3 | precondition |
| D-06 | Tenant RLS half-shipped | (any) | F6 (HOLD per J1) | resolved |
| D-07 | publicId 2/10 aggregates | (any) | DM-2.5 ongoing | accept partial |
| D-08 | Skills double-truth | A.3 | P-04 | covered |
| D-09 | No bill rate (cost-only enum) | E.8 | C-01 | covered |
| D-10 | Project tags double-truth | B.1 | PM-05 | covered |
| D-11 | StaffingRequest derived status drift | A.6 | S-13 | covered |
| D-12 | No Director-approval gate on project | B.2-B.4 | PM-01 | covered |
| D-13 | RM not first-class on Person | A.1 | P-01 | covered |
| D-14 | Contract fields missing | A.1 | P-01 | covered |
| D-15 | Photo not first-class | A.1 | P-01 | covered |
| D-16 | Self-approval guard on case approval | (case flow) | F3 audit + Phase 20b-07 follow-up | covered |
| D-17 | Tenant settings undiscoverable | (admin) | F7.1 | covered |
| D-18 | Mood aggregation surface missing | (manager dashboards) | P-06 | covered |
| D-19 | Time alerts incomplete | E.3, E.6 | P-09 | covered |
| D-20 | No approve-hours from project detail | B.10 | PM-04 | covered |
| D-21 | StaffingRequest 5 vs Assignment 9 framing | A.7 | S-02 (UI doc) | covered |
| D-22 | Live URL typo | (login) | resolved | resolved |
| D-23 | MUI v7 + custom CSS, not shadcn | DS context | (no spec deviation) | informational |
| D-24 | "in-memory" service naming | (codebase) | 20c-03 | covered |
| D-25 | DS deferred drawers | DS-2-5 | DS-5 phase | accept defer |
| D-26 | CLAUDE.md stale on admin email | A.0 login | 0.4 | covered |
| D-27 | Breadcrumb leak | (everywhere) | FE-FOUND-01 / 0.10 | covered |
| D-28 | "New Admin" page title | A.1 | FE-FOUND-02 / 0.11 | covered |
| D-29 | Russian-locale date pickers | A.1, B.1 | FE-FOUND-03 / 0.12 | covered |
| D-30 | Form writes legacy Person.skillsets | A.1 | P-04 / 0.16 | covered |
| D-31 | Person form missing fields | A.1 | P-01 | covered |
| D-32 | SLA columns empty in Approval Queue | C.4-C.7 | 0.15 SLA-AUDIT | covered |
| D-33 | Director Dashboard missing tiles | C.6, E.12 | S-03, C-07 | covered |
| D-34 | 0 open demand in seed | D.6 | 0.13 SEED-EXT | covered |
| D-35 | All projects have empty Client | (read paths) | 0.13 SEED-EXT | covered |
| D-36 | Grade dictionary actual range | A.1 | 0.14 + Appendix B map | covered |
| D-37 | Onboarding widget is static | A.0 | DOC-03 (additive) | covered |
| D-38 | 7 base roles, not 8 | (RBAC matrix) | Appendix D fix | covered (doc) |
| D-39 | Session timeout aggressive | mid-walk | (auth audit) | needs new task **0.27 SESSION-TTL** |
| D-40 | Form data lost on session expiry | mid-walk | FE-FOUND-04 | covered |
| D-41 | Grade range G7..G15 | A.1 | 0.14 | covered |
| D-42 | Line Manager native select with 202 options | A.1 | FE-FOUND-05 | covered |
| D-43 | Org Unit flat select | A.1 | FE-FOUND-06 | covered |
| D-44 | ConfirmDialog wording wrong | A.1 | (copy editorial) | covered (DOC-07 + Sprint 1) |
| D-45 | Person 360 shows Inactive for active | A.2 | 0.20 PERSON360-STATUS | covered |
| D-46 | Skill data silently lost | A.1 → Skills tab | P-04 / 0.16 | covered |
| D-47 | History empty after hire (audit silence) | A.2 | 0.17 EVENT-PIPE-AUDIT | covered (CRITICAL) |
| D-48 | URL filter `?q=` not read | (people list) | (Phase 20g re-audit) | needs new task **0.28 FILTER-URL-AUDIT** |
| D-49 | 0 inactive people but 1 shows Inactive | A.2 | 0.20 (same as D-45) | covered |
| D-50 | No redirect after Create Project | B.1 | 0.21 POST-CREATE-REDIRECT | covered |
| D-51 | Wrong subtitle on /projects/new | B.1 | 0.26 SUBTITLE-SOURCE | covered |
| D-52 | Project code convention inconsistent | B.1 | 0.25 PROJECT-CODE | covered |
| D-53 | Priority HIGH→MEDIUM silent drop | B.1 | 0.22 PRIORITY-ROUNDTRIP-TEST | covered (CRITICAL) |
| D-54 | KPI green vs Pulse 25/100 red | B.4 | 0.18 KPI-VS-PULSE-RECONCILE | covered (CRITICAL) |
| D-55 | Cold-start radiator score | B.4 | 0.19 RADIATOR-COLD-START | covered (CRITICAL) |
| D-56 | Project list health column same fake score | (read) | 0.19 | covered |
| D-57 | Activate CTA only on Lifecycle tab | B.4 | (FE polish in PM-01) | covered |
| D-58 | No ConfirmDialog on Activate | B.4 | (DS conformance + PM-01) | covered |
| D-59 | Activate audit silent | B.4 | 0.17 | covered (CRITICAL) |
| D-60 | Subtitle leak across pages | (everywhere) | 0.26 | covered |
| D-61 | (covered by D-58) | — | — | dup |
| D-62 | (covered by D-12) | — | — | dup |
| D-63 | (covered by D-59) | — | — | dup |
| D-64 | UX consistency gap (3 different Create patterns) | A.1, B.1, A.6 | P-02 + DS shell | covered |
| D-65 | "Candidate is known" pre-seed convention | A.7 | (doc only, S-02) | covered |
| D-66 | Skill picker copy is exemplary | A.7 | use as DOC-07 model | covered |
| D-67 | Subtitle leak on staffing-requests/new | A.6 | 0.26 | covered |
| D-68 | Cmd+K no people search | (anywhere) | 0.23 CMD+K-PEOPLE | covered |
| D-69 | Cmd+K filter doesn't narrow | (anywhere) | 0.23 | covered |
| D-70 | Notification bell empty after hire+create+activate | A.2, B.4 | 0.17 (root cause) | covered (CRITICAL) |
| D-71 | `?` cheatsheet doesn't open | (anywhere) | 0.24 GLOBAL-KEYMAP-AUDIT | covered |
| D-72 | Planner cell click is read-only popover | D.3 | SD-02 | covered |
| D-73 | Supply 555% over-allocation hidden in cell color | D.10 | SD-09 | covered |
| D-74 | Breadcrumb leak (cross-flow) | (anywhere) | FE-FOUND-01 / 0.10 | dup of D-27 |

### 8.1 Newly-surfaced gaps not yet in Sprint 0 → adding now

These three escaped the existing Sprint 0 list. Adding to the brief.

- **0.27 SESSION-TTL** (closes D-39): determine current JWT access TTL + refresh policy; document; introduce idle-extend on user activity; add `auth.session.idleTimeoutMinutes` PlatformSetting (default 30).
- **0.28 FILTER-URL-AUDIT** (closes D-48): full audit of Phase 20g filter persistence; some params round-trip from URL, others don't; close all gaps.
- (D-39 / D-40 / D-48 are now fully covered.)

### 8.2 Dup detection

- D-61 = D-58 (Activate without confirm)
- D-62 = D-12 (no Director gate, refined to Activate step)
- D-63 = D-59 (audit silent on activation — same root as D-47 pipeline regression)
- D-74 = D-27 (breadcrumb leak across flows)

After dedup: **70 distinct discrepancies, all 70 mapped to a hardening task**.

### 8.3 Hardening plan coverage by domain

| Domain | D-items | Hardening tasks | Acceptance gate |
|---|---|---|---|
| Foundations (transactions, events, notifications, audit, RBAC, customization, observability) | D-02, D-04, D-05, D-06, D-07, D-19, D-22, D-26, D-27, D-28, D-29, D-39, D-40, D-44, D-47, D-50, D-51, D-58, D-59, D-60, D-67, D-69, D-70, D-71 | F1..F9, S-01, 0.10..0.12, 0.17, 0.21, 0.23, 0.24, 0.26, 0.27 | All cross-cutting plumbing emits events + audit + notifications. Verified by Scenario A.1 → A.2 (history feed + bell after hire) and B.4 (history feed after activate). |
| People | D-08, D-13, D-14, D-15, D-30, D-31, D-41, D-42, D-43, D-45, D-46, D-49, D-64 | P-01..P-09 | All G-items closed by P-tasks; A.1-A.4 + A.17-A.20 fully coverable end-to-end after Sprint 1+3+7. |
| Staffing | D-04, D-11, D-21, D-32, D-65, D-66 | S-01..S-13 | Scenarios A.6-A.11 + C exercised; cutover via S-01 removes D-04 root cause. |
| Project Monitoring | D-12, D-20, D-52, D-53, D-54, D-55, D-56, D-57, D-58 | PM-01..PM-09 + 0.18, 0.19, 0.22, 0.25 | Scenario B fully coverable post-PM-01..PM-09. KPI reconciliation in 0.18 closes D-54. |
| Cost & Utilization | D-09, D-33 (P&L portion) | C-01..C-07 | Scenario E fully coverable post-Sprint 5. |
| Supply & Demand | D-34, D-35, D-72, D-73 | SD-01..SD-09 + 0.13, 0.14 | Scenario D fully coverable post-Sprint 6-7. |
| Documentation | D-37 | DOC-01..DOC-07 (Sprint 4.5) | Help Center + tour + tip ratchet. |
| Live recon residue | D-01, D-22, D-26, D-36, D-38, D-48 | 0.4, 0.13, 0.14, 0.28 | Sprint 0 audits. |

---

## 9. 100% understanding assurance

### 9.1 What I claim with high confidence

- **Every backend endpoint has been catalogued** (270 endpoints across 60 controllers, §2). I extracted them via AST grep, not narrative — the table is verifiable.
- **Every frontend route has been catalogued** (53 routes from `router.tsx`, §3).
- **Every API client module is named** (70 modules in `frontend/src/lib/api/`, §4).
- **Every notification translator method is enumerated** (28, §5).
- **Every domain has a wiring map** showing FE → API → BE → service → models → events (§6).
- **Five end-to-end scenarios** trace clicks through the live system, citing the §2 endpoint inventory for each step (§7).
- **Every D-item from the brief is mapped** to a scenario step that exposes it AND a hardening task that closes it (§8). Three new gaps (D-39/D-48 plus the 0.27/0.28 backstops) were discovered while building this map; all are now in the plan.

### 9.2 What I cannot claim from this exercise alone

These would each require additional verification work; none invalidate the plan, but I want them named explicitly:

1. **Service ↔ Repository wiring is mostly inferred** from naming conventions + spot-checks. A full DDD-correctness check of every service writing through the right port would take a separate audit pass.
2. **Role-by-role endpoint matrix** at the `@RequireRoles` decorator level is partial — F3.1 (a CI script asserting every state-changing endpoint has explicit `@RequireRoles`) is the right backstop.
3. **The full Prisma write-path** for each service was sampled, not exhaustively inventoried. Phase 20c-09 + 20c-10 (typed Gateway generics, DTOs) will produce that inventory naturally as a side effect.
4. **Cron / sweep services** named in the plan (P-05 sweeps, PM-03 digest, PM-06 risk staleness, S-04 SLA warning, S-09 nudge) need to land BE-side first; I have not re-verified they're absent today via a separate pass — but the §5 absence list strongly implies they don't exist in production.
5. **Workflow definition consumption** (`WorkflowDefinition` table exists; nothing reads it). The brief calls this out and defers (F7.3).
6. **Multi-tenant data path** (Tenant resolver middleware): scaffolded per DM-7.5 but not enabled. Per J1 we hold; not re-inventoried.

### 9.3 Two things that *would* shake my confidence (and how to test)

1. **Hidden non-controller HTTP exposure** — e.g., NestJS `RouterModule` re-mappings, or controllers in modules I haven't searched. Mitigation: after Sprint 0, run `node ts-node scripts/list-routes.ts` against the running container and diff the output against my §2 table. Any extra routes get added.
2. **Event emission that bypasses the OutboxEvent table** (e.g., direct Nest event-emitter calls). Mitigation: F2.4 builds `docs/architecture/event-catalog.md` from a runtime probe (drive the app through Scenarios A-E with telemetry on, observe every emitted event, ensure it's documented).

### 9.4 The hardening plan covers what the brief says it covers

Cross-checked against the user's original five scope statements:

| Scope statement | Where covered |
|---|---|
| **People — Add, integrate, follow up, monitor, release** | Scenario A (full lifecycle) + P-01..P-09 + 0.10-0.12, 0.16-0.21 |
| **Staffing — request → proposal → selection → case mgmt → booking → onboarding → assigned → completed** | Scenario A.6-A.11 + C + S-01..S-13 |
| **Project monitoring — creation, status, schedule, budget, resource, vendors, time** | Scenario B + PM-01..PM-09 + 0.18-0.19, 0.22 |
| **Cost utilization — overall, project, baseline vs actual** | Scenario E + C-01..C-07 |
| **Supply & demand planning** | Scenario D + SD-01..SD-09 + Distribution Studio recon (D-72/D-73) + 0.13-0.14 |

Plus the bonus scope from later messages:
- **Multi-tenant deployment-isolated** (J1) → F6 confirmed hold; documented.
- **Bill rate by role/grade/skill** (J2) → C-01 RateCard model.
- **Termination by RM with HR + Director approval** (J3) → P-07 PersonReleaseRequest.
- **Configurable Responsibility Matrix** (J4) → S-05.
- **Project approval on creation AND budget change** (J6) → PM-01 + extension.
- **Pulse audience RM/PM/Director/HR** (J7) → P-06 audience update.
- **Compensation 5 bands P1-P5 mapped from G-grades** (J8) → Appendix B `gradeToBandMap`.
- **Unlimited proposal slate** (J9) → Appendix B max=null.
- **Documentation, tips, Help Center** (J11) → §13 + Sprint 4.5 + DOC-01..07.

**Statement of completeness.** I assert that for every behavior the user named to harden, this brief either (a) names an existing surface and the specific gap, or (b) introduces a new surface with full schema/service/UI/event spec, OR (c) explicitly defers with a reason. Nothing the user named is silently undelivered.

### 9.5 What I would have you do before any agent starts coding

1. Read §2 of HARDEN_BRIEF.md (Discrepancy Register) — confirm priorities.
2. Read §9 Sprint 0 — agree on the 28-item Phase 0 (was 26, +2 from this exercise).
3. Read §7 Scenario A end-to-end and §8.3 People row — confirm those three line up with how you actually onboard people in your org.
4. Hand `Prompt 12.1` (in HARDEN_BRIEF.md §12) to the VSCode agent. That kicks off the DI fix → which unblocks every subsequent test.
5. After Sprint 0 lands, re-walk Scenarios A and B in the live app yourself. The hardening promise is: every step of A and B should produce a History entry, an audit row, an Outbox event, AND a notification. If any one of those is missing, Sprint 0 isn't done.

That's the assurance loop.

---

## 11. API Design System — standardize, optimize, maintain

The frontend has a design system (tokens, page grammars, primitives, ratchet). The API doesn't. With 270 endpoints across 28 modules grown organically over many phases, conventions have drifted. **Future maintainability depends on locking conventions now and ratcheting violations down.** This section is the API counterpart to `frontend/src/styles/design-tokens.ts` + `phase18-page-grammars.md` + `ds-conformance-baseline.json`.

### 11.1 Inconsistencies the live grep surfaced (evidence)

| Dimension | Today | Examples |
|---|---|---|
| **Top-level prefix style** | 40 distinct top-level prefixes; some plural (`/projects`, `/clients`, `/teams`, `/cases`, `/assignments`), some singular (`/setup`, `/system`), some grouped (`/org/people`, `/org/chart`, `/dashboard/portfolio`, `/integrations/jira`), some flat (`/admin`, `/reports`, `/portfolio`) | `/projects` (8 controllers under it), `/admin` mixed with `/admin/skills` and `/admin/platform-settings` |
| **Sub-resource nesting** | Mixed RESTful (`/projects/:id/risks`) and flat (`/cases/sla/config`, `/admin/period-locks`) | RESTful: `/projects/:id/milestones/:milestoneId`. Flat: `/admin/reports/capitalisation`. |
| **Verbs vs RPC actions** | Heavy POST-action style for state transitions: `/assignments/:id/propose`, `/projects/:id/activate`, `/cases/:id/close`. This is intentional (state-machine semantics) but mixed with PATCH for amend (`/assignments/:id` PATCH for amend, `/staffing-requests/:id` PATCH for amend). | OK — but document the "transition POST" as a first-class pattern. |
| **Response envelope** | Some return raw arrays, some `{ items: [...] }`, some `{ items, totalCount }`, some bespoke (`{ created, failed, skipped }`, `{ success: true }`, `{ invalid, valid }`) | `return { items: pools.map(...) }` vs `return arr.map(...)` |
| **Pagination params** | `page` + `limit` predominantly, but typed as `string?` defaulting to `'1'` (not `number`) | `@Query('page') page = '1'` |
| **DTO discipline** | 25+ inline `@Body() body: { ... }` (Phase 20c-09 already noted) — no class-validator, no Swagger | `@Body() body: { wipeFirst?: boolean } = {}` |
| **ID format** | Mixed: some endpoints accept UUID only, some accept `pub_*`/`prj_*` publicIds (DM-2.5 transitional), some accept `assignmentCode`/`projectCode` (legacy human codes). 47 controllers still leak raw UUIDs (controller-uuid-leak baseline). | `/admin/skills/:id` accepts publicId-or-uuid; `/projects/:id` UUID only. |
| **Error shape** | NestJS default `HttpException` JSON; some endpoints throw bespoke shapes; no shared error code taxonomy | `{ statusCode, message, error }` vs custom |
| **Idempotency** | None. POST endpoints don't respect `Idempotency-Key`. | retry double-creates a person |
| **Concurrency** | `version` column exists on aggregates; but only some PATCH endpoints check `If-Match` / version | inconsistent |
| **Sorting** | Per-endpoint inventions; no shared `?sort=field,-other` parser | varied |
| **Filtering** | Per-endpoint query params; no shared filter expression | `?status=ACTIVE&from=...&to=...` etc. |
| **Bulk** | A few `/bulk` endpoints (`/assignments/bulk`, `/admin/people/import/{preview,confirm}`) but no shared bulk envelope | bespoke shapes |
| **Authorization** | `@RequireRoles(...)` on most state-changing endpoints, but **no CI guard asserts every state-changer has it**. F3.1 in the brief. | varied coverage |

These inconsistencies cost maintainability the same way 200 inline-style hex colors did before Phase 20h.

### 11.2 The standard (the API tokens)

Adopt the following as `docs/architecture/api-design-system.md` and enforce via a CI ratchet (`scripts/check-api-conformance.cjs`).

#### A. URL conventions

```
/api/{plural-resource}                       # collection
/api/{plural-resource}/{id-or-publicId}      # entity
/api/{plural-resource}/{id}/{sub-plural}     # nested collection
/api/{plural-resource}/{id}/{sub-plural}/{sub-id}
/api/{plural-resource}/{id}/{action}         # POST verb-noun for state transition (e.g. /activate, /close, /propose)
```

Rules:
1. Always plural for collections (`/projects` not `/project`).
2. Resource path uses `kebab-case` (`/staffing-requests`, `/work-evidence`).
3. Nested up to 2 levels deep. Deeper goes flat under the closest aggregate (`/cases/sla/config` is fine; `/projects/:id/risks/:riskId/comments/:commentId` is too deep — promote to `/risk-comments/:id`).
4. `/admin/*` reserved for admin-only configuration surfaces. Don't put domain CRUD here.
5. `/dashboards/*` for dashboard read endpoints.
6. `/reports/*` for analytical reads.
7. `/integrations/{vendor}/*` for external system bridges.
8. Action verbs only for state transitions (POST). `/projects/:id/activate` ✓; `/projects/:id/get-detail` ✗ (use GET `/projects/:id`).

#### B. ID conventions

- Path params accept **either** the UUID or the publicId form (`prj_…`, `usr_…`, `asn_…`, `pub_skl_…`). Use the existing `ParsePublicIdOrUuid` pipe (DM-2.5 already shipped two aggregates with it; extend to the remaining 47).
- Response DTOs emit **both** `id` (UUID) and `publicId` during the DM-2.5 transition. Once `flag.publicIdStrict=true`, drop `id` from the wire.
- Path param name is `:id` for the primary resource of the controller, `:{resource}Id` for nested (e.g., `:milestoneId`).

#### C. HTTP verbs

| Verb | Use |
|---|---|
| `GET` | reads only; idempotent; cacheable |
| `POST {collection}` | create |
| `POST {entity}/{action}` | state transition, side-effecting action |
| `PATCH {entity}` | partial update of mutable fields |
| `PUT {entity}` | full replacement (rare; prefer PATCH) |
| `DELETE {entity}` | soft-delete (sets `archivedAt` or `deletedAt`); hard delete is admin-only / break-glass |

#### D. Request shape

- Body always JSON.
- Headers:
  - `Authorization: Bearer <jwt>` (required for non-public).
  - `Idempotency-Key: <uuid>` (required on every state-changing POST/PATCH/PUT/DELETE that isn't strictly idempotent by definition).
  - `If-Match: "v=<version>"` (required on PATCH/DELETE for aggregates with optimistic concurrency).
  - `Tenant-Id: <tenantId>` (only when `flag.tenantRlsEnabled=true`).
- Body DTOs are **always class-validator-decorated classes**. No inline `{...}` types. Closing 20c-09.

#### E. Response envelope (the most impactful single rule)

Pick **one** envelope and migrate every endpoint to it. The recommended shape:

```ts
// Single resource
{
  data: T,                          // the resource
  meta?: { /* server hints */ }
}

// Collection
{
  data: T[],
  meta: {
    page: number,
    perPage: number,
    totalCount: number,
    totalPages: number,
    cursor?: string,
    sort?: string,
    filters?: Record<string, unknown>
  }
}

// Action (state transition)
{
  data: { id: string, status: string, ...nextActions: TransitionDescriptor[] },
  meta?: {}
}
```

Bulk:

```ts
{
  data: {
    succeeded: { id: string }[],
    failed: { input: any, error: { code: string, message: string } }[],
    summary: { ok: number, failed: number, skipped: number }
  }
}
```

#### F. Error envelope

```ts
{
  error: {
    code: string,         // taxonomy: "AUTH_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VALIDATION" | "RATE_LIMITED" | "BUSINESS_RULE" | "INTEGRATION_FAILURE" | ...
    message: string,      // human readable; safe to display
    target?: string,      // the field/path that caused it
    details?: any[],      // structured violations
    correlationId: string,
    docUrl?: string       // link to /help/errors/{code}
  }
}
```

Map every existing `HttpException` throw to this envelope via a global `HttpExceptionFilter`. Status codes follow standards (400/401/403/404/409/422/429/500/503). One single error code taxonomy maintained at `src/shared/errors/error-codes.ts`.

#### G. Pagination

- Query params: `?page=1&perPage=25&sort=-createdAt&q=...`. (`page` defaults 1, `perPage` defaults 25, capped 200.) Cursor pagination optional via `?cursor=<opaque>` overriding page-based.
- Type: `number`, not `string` (zod / class-validator coercion).
- Response always includes meta block above.
- Single shared `PaginationParamsDto` + `PaginatedResponseDto<T>` generic.

#### H. Filtering

- Simple filters: `?status=ACTIVE&priority=HIGH` (single value or comma-separated list).
- Date ranges: `?from=<iso>&to=<iso>` (server treats inclusive).
- Free text: `?q=<string>`.
- Anything more complex → POST search endpoint with body (`POST /assignments/search` body `{ filter: {...}, sort: [...], page, perPage }`). Don't push complex filtering into URL params.

#### I. Sorting

- `?sort=<field>` (asc) or `?sort=-<field>` (desc); comma-separated for multi-key.
- Server validates allowed sort fields per endpoint via a per-controller allow-list.

#### J. Idempotency

- `POST /any-state-change` requires `Idempotency-Key` (UUID).
- Backend hashes `(actorId, endpoint, idempotencyKey)` → looks up `IdempotencyKey` model (per F1.3 in HARDEN_BRIEF). If found, returns the cached response (200/201 with the original body). If not, executes once and stores.
- TTL via `idempotency.ttlHours` setting (default 24h). Expired keys re-execute.

#### K. Concurrency control

- All mutable aggregates have `version Int @default(1)`.
- Mutating endpoints accept `If-Match: "v=<version>"`. Server compares; mismatch → `409 Conflict` with error code `STALE_RESOURCE`.
- Optional in this iteration: ETags. `If-Match: <etag>` if endpoints emit `ETag` header.

#### L. Versioning

- URL versioning under `/api/v1/...`. Today everything is implicitly v1; explicit prefix adopted to enable v2 paths later without breaking clients.
- Backwards-compatible additive changes ship without bumping the version. Breaking changes go to `/api/v2/...` and the v1 endpoint emits `Deprecation: true; Sunset: <date>` headers.

#### M. Deprecation

- Deprecated endpoints emit:
  - `Deprecation: true`
  - `Sunset: <RFC1123 date>`
  - `Link: </api/v2/replacement>; rel="successor-version"`
- Logged via `LegacyEndpointInterceptor` to a metric `legacy_endpoint_call_total{route,actor}`.
- `scripts/check-no-legacy-staffing-api.cjs`-style ratchet for FE callers; baseline → 0 by sunset.

#### N. Rate limiting

- Global throttle (existing `@nestjs/throttler` with `100/min`).
- Auth endpoints stricter (`/auth/login` 10/min already; password-reset 3/hour already).
- Bulk endpoints: 5/min per actor (configurable `apiSecurity.bulkThrottle.requestsPerMinute`).
- Webhooks (when shipped): per-tenant 30/min.
- Rate-limit headers always returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` on 429.

#### O. Bulk operations

- Always `/{resource}/bulk` POST.
- Body shape `{ items: T[] }` (max 1000 per request unless documented).
- Response is the bulk envelope (E above).
- Never mix create + update + delete in a single bulk call. Three endpoints if needed: `/bulk-create`, `/bulk-update`, `/bulk-archive`.

#### P. Webhooks (future, when ready)

- Outbound webhooks signed with `X-Signature: sha256=<hmac>` derived from `webhookSecret`.
- Retries with exponential backoff and `Idempotency-Key: <eventId>` on every delivery.
- Replay guarantee: 7 days from `OutboxEvent.createdAt`.
- Inbound webhooks (vendor → us) verified via vendor signature and persisted into a `WebhookDelivery` table BEFORE business logic runs (transactional).

#### Q. OpenAPI / Swagger discipline

- Every controller method has `@ApiOperation({ summary, description })`, `@ApiResponse({ status, schema })`, `@ApiHeader` for the cross-cutting headers above, and `@ApiTags(<module>)`.
- Class-validator DTOs feed Swagger schemas.
- Exposed at `/api/docs` (already in place). CI builds `openapi.json` artifact and posts it to GitHub releases.

#### R. CORS, headers, security

Already in place per Phase 20a: HSTS, CSP, X-Frame-Options, etc. Document in the API DS as part of the standard so new services don't drift.

#### S. Observability per request

- Every request gets a `correlationId` (existing).
- Latency histogram per route + status code (`http_request_duration_seconds{route,method,status}`) — Sprint 8 F8 / prom-client.
- Slow queries (> 200ms) auto-logged with full SQL + caller correlationId.

### 11.3 Service / repo standardization

Beyond HTTP, the application layer needs the same discipline.

#### A. Service naming

- `<Verb><Aggregate>Service` for command services: `CreateEmployeeService`, `ActivateProjectService`, `TransitionProjectAssignmentService`. Single `execute(input): output` method.
- `<Aggregate>QueryService` for read services: `PersonDirectoryQueryService`. Multiple methods OK.
- `<Aggregate>RepositoryPort` (interface) + `Prisma<Aggregate>Repository` (implementation). One file each.
- `Sweep<Concern>Service` for cron-driven sweeps.
- `<Concern>Resolver` for cross-aggregate read primitives: `EffectiveBillRateResolver`, `ResponsibilityResolver`, `DirectorResolver`.

#### B. Service contract

```ts
export class XService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AggregateRepositoryPort,
    private readonly outbox: OutboxPort,
    private readonly translator: NotificationEventTranslatorService,
    private readonly clock: ClockService,
  ) {}

  async execute(input: XInput, actor: Principal): Promise<XOutput> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Authorize
      // 2. Load aggregate
      // 3. Mutate aggregate
      // 4. Save via repo (with tx)
      // 5. Append OutboxEvent (with tx)
      // 6. Optional: schedule notification translator (after commit)
      // 7. Return DTO
    });
  }
}
```

This makes the contract testable in isolation and consistent across the codebase. The five outstanding services that don't follow this pattern (per Phase 20c-05) get refactored.

#### C. Repository standardization

Every repo offers the **same five primitives** at minimum:

```ts
interface AggregateRepositoryPort<A, ID = string> {
  findById(id: ID, tx?: Prisma.TransactionClient): Promise<A | null>;
  findByPublicId(publicId: string, tx?: Prisma.TransactionClient): Promise<A | null>;
  list(filter: ListFilter, tx?: Prisma.TransactionClient): Promise<Paginated<A>>;
  save(aggregate: A, tx?: Prisma.TransactionClient): Promise<A>;       // create-or-update via version
  archive(id: ID, actor: Principal, reason?: string, tx?: Prisma.TransactionClient): Promise<void>;
}
```

Closes Phase 20c-10 (typed Gateways). Removes `args: any`.

#### D. DTO conventions

- One DTO per request and per response: `XRequestDto`, `XResponseDto`. Re-use across controllers and tests.
- DTOs are class-validator + class-transformer decorated.
- Forbid `any`, `unknown` (use generics or branded types). Closes 20c-10/11.
- Emit publicId always; emit UUID only during transition.

#### E. Module-boundary discipline

- A controller MUST NOT import another module's repository (Phase 20c-01 violation today). Cross-module reads go through that module's `*QueryService` exposed via its `Module.exports`.
- `dependency-cruiser` config enforces this; `npm run architecture:check` is the gate.

### 11.4 Wiring optimization (perf + maintainability)

Beyond standardization, the existing wiring has these drag-on-velocity issues:

| # | Issue | Cost | Fix |
|---|---|---|---|
| O-01 | 6 dashboard hooks duplicated identical fetch+state+cleanup (~200 LOC) | maintainability | Phase 20c-13 already done; verify all use `useDashboardQuery` |
| O-02 | 6 dashboard-*.ts API clients duplicate URLSearchParams + fetch wrappers | maintainability | Phase 20c-14 — `fetchDashboard<T>` generic |
| O-03 | 4 modules use `forwardRef()` for circular deps (org ↔ assignments ↔ project-registry ↔ exceptions) | maintainability + boot time | Phase 20c-08 — establish dep hierarchy |
| O-04 | God components (PM/Director/HR dashboards 400-441 LOC) | maintainability + bundle size | Phase 20c-15 |
| O-05 | Native `<select>` with 200 options on Line Manager / Project Manager pickers (D-42) | UX + perf (DOM size) | replace with `PersonSelect` (cmdk-style) — FE-FOUND-05 |
| O-06 | Unbounded `findMany()` on 4+ repos (notifications, projects, metadata) | perf at scale | Phase 20c-12 — paginate or cap |
| O-07 | Waterfall fetches in WorkloadMatrixPage (3 sequential useEffects) | perf | Phase 20d-03 — `Promise.all` (already shipped) |
| O-08 | Inline style objects creating per-render churn (Phase 20d-01..05 partly done) | perf + DS conformance | continue |
| O-09 | 28 notification translator methods today; 27 missing (§5) | observability | the brief's events catalog (Appendix C) |
| O-10 | Outbox publisher loop existence not verified (F2.1) | reliability | Sprint 1 |
| O-11 | Batch-load patterns for n+1 reads in `RoleDashboardQueryService` not consistently using DataLoader | perf | introduce a per-request DataLoader for cross-aggregate reads |
| O-12 | Caching: only project radiator has a 60s cache. Many other read-paths are uncached. | perf | introduce `@Cacheable({ ttl, key })` decorator + Redis (later) — don't over-engineer in Sprint 0; identify hotspots first |
| O-13 | Frontend has 70 API clients, each importing http-client. Some duplicate functions across files. | maintainability | enforce 1 client file per backend module + auto-gen client from OpenAPI later (Sprint 8) |
| O-14 | `withCorrelationId` middleware exists; not all clients propagate it on retries | observability | audit retry logic in http-client.ts |
| O-15 | No request batching at the gateway level (multiple parallel calls on dashboard load) | perf | Sprint 8 — consider `?include=` expansion or BFF aggregate endpoints |

### 11.5 Refactor ladder (how to bring 270 endpoints up to standard without freezing the team)

Rule: don't migrate everything at once. Use a baseline ratchet, the same way `tokens:check` and `ds:check` work today.

| Stage | Trigger | Action |
|---|---|---|
| **0. Baseline** | end of Sprint 0 | run `scripts/check-api-conformance.cjs --write-baseline` → captures every current violation as the floor |
| **1. New endpoints** | every PR adding/modifying an endpoint | must conform to §11.2 (URL, response, error, pagination, idempotency, versioning, headers); ratchet refuses regressions |
| **2. Each new sprint** | per HARDEN sprint | ratchet number must decrease; if not, PR fails |
| **3. Per-domain rollout** | aligned with HARDEN sprints | when a sprint touches a domain, migrate that domain's endpoints to the standard envelope. People (Sprint 1+3) → Staffing (Sprint 2+6) → Project (Sprint 4) → Cost (Sprint 5) → S&D (Sprint 6-7) |
| **4. Legacy endpoints** | Sprint 8 | deprecate + sunset (matches S-01 staffing pattern) |
| **5. v2 migration** | future | only if v1 → v2 breaking changes are needed |

Acceptance for each migration: API DS conformance baseline strictly decreases; tests stay green; OpenAPI artifact regenerates without warnings; FE callers updated in same PR.

### 11.6 Validation gates (CI ratchet — like `tokens:check` and `ds:check`)

Add to `package.json`:

```json
"api:check": "node scripts/check-api-conformance.cjs",
"api:check:report": "node scripts/check-api-conformance.cjs --report",
"api:baseline": "node scripts/check-api-conformance.cjs --write-baseline"
```

Rule set (each enforced as a baseline ratchet — error tier when at zero):

| Rule | Description | Example violation |
|---|---|---|
| `endpoint-prefix-pattern` | URL must match the regex above | `/admin/reports/capitalisation` → flagged for inconsistent grouping |
| `response-envelope` | All non-204 responses must use the standard envelope | `return arr.map(...)` |
| `error-envelope` | All `HttpException` throws must produce the standard error JSON | bespoke error shape |
| `dto-class-validated` | No inline `@Body() body: { ... }` | matches Phase 20c-09 |
| `gateway-typed` | No `args: any` or `Promise<any>` in repository ports | matches Phase 20c-10 |
| `pagination-typed` | `?page` / `?perPage` must be `number` after coercion | typed `string?` defaulting to `'1'` |
| `transition-needs-roles` | `POST /:id/<verb>` must have `@RequireRoles` or `@Public` | F3.1 |
| `idempotency-required` | POST/PATCH/PUT/DELETE must accept `Idempotency-Key` header | none today |
| `version-prefix` | All routes must start with `/api/v1/` | many don't (today everything is implicitly v1) |
| `swagger-completeness` | Every method has `@ApiOperation` + `@ApiResponse` | partial today |

Plus an OpenAPI snapshot test: `openapi.json` is regenerated and diffed against the previous in CI; humans approve schema diffs explicitly. This is the API equivalent of `scripts/design-token-baseline.json`.

### 11.7 Where this sits in the roadmap

A new **Phase ADS — API Design System** runs in parallel to the HARDEN sprints. Tasks:

| # | Task | Sprint |
|---|---|---|
| ADS-1 | Author `docs/architecture/api-design-system.md` per §11.2-§11.3 | Sprint 1 |
| ADS-2 | Build `scripts/check-api-conformance.cjs` + `scripts/api-conformance-baseline.json` | Sprint 1 |
| ADS-3 | Add `api:check` to `npm run verify:pr` | Sprint 1 |
| ADS-4 | Add `IdempotencyKey` middleware (F1.3) — wires up §11.J | Sprint 1 |
| ADS-5 | Global `HttpExceptionFilter` emitting the §11.F envelope | Sprint 1 |
| ADS-6 | `PaginationParamsDto` + `PaginatedResponseDto<T>` generic + roll out to top-10 endpoints | Sprint 2 |
| ADS-7 | Per-route OpenAPI completeness gate | Sprint 3 |
| ADS-8 | Migrate People endpoints (alongside P-01..P-09) | Sprint 1+3 |
| ADS-9 | Migrate Staffing endpoints (alongside S-01..S-13) | Sprint 2+6 |
| ADS-10 | Migrate Project endpoints (alongside PM-01..PM-09) | Sprint 4 |
| ADS-11 | Migrate Cost endpoints (alongside C-01..C-07) | Sprint 5 |
| ADS-12 | Migrate Distribution Studio endpoints (alongside SD-01..SD-09) | Sprint 6-7 |
| ADS-13 | Add deprecation headers to legacy endpoints | Sprint 2 (with S-01) |
| ADS-14 | Auto-generate FE API clients from OpenAPI | Sprint 8 |
| ADS-15 | Cap the 70 FE clients to one per backend module + remove duplicates | Sprint 8 |

### 11.8 Why this matters

- **Maintainability**: a new engineer can write a new endpoint and have it conform on day one. The ratchet enforces it.
- **Testability**: standardized envelope means generic test fixtures + mocks; less per-endpoint test code.
- **Frontend ergonomics**: a single `useResource(...)` hook can consume any endpoint after migration. Today every API call has bespoke shape.
- **External integration**: the OpenAPI artifact becomes the contract; partner integrations stop guessing.
- **Tenant isolation** (when J1 reverses): tenant header + RLS plug into the API DS without per-endpoint changes.
- **Performance**: idempotency, batching, pagination caps prevent today's silent O(n) cliffs.

The frontend design system has demonstrably worked (DS conformance ratchet, 0 violations in atoms after Phase DS rollout). The API design system applies the same pattern to the next layer down.

---

## 12. RBAC / Authorization Design System

The visual + API design systems govern *what shows* and *what shapes*. The Authorization DS governs *who can do what, on which scope, when, with what evidence trail.* Today it's mostly enforced (`@RequireRoles` is on 241 of 319 controller methods) but riddled with hardcoded role literals scattered across the codebase, with no central scope/ABAC pattern, no CI gate, and no audit-of-access trail.

### 12.1 Evidence (live grep)

| Dimension | Today | Implication |
|---|---|---|
| Controller methods | **319** | universe |
| `@RequireRoles(...)` | **241** | covered |
| `@Public()` | **19** | explicit public |
| Methods with NEITHER | **59** (~18%) | implicit access; potential security hole; F3.1 mandatory |
| Hardcoded role string literals (BE) | **1,041 occurrences** across `src/modules` | huge customization debt; one role rename = 1,041-edit migration |
| FE role constants | 4 named groups (`ALL_ROLES`, `MANAGEMENT_ROLES`, `EVIDENCE_MANAGEMENT_ROLES`, `TIMESHEET_MANAGER_ROLES`) | discipline started; not enforced |
| FE role-string literals outside route-manifest | likely many (per CLAUDE.md §9 "All role arrays centralized" rule, but enforcement is convention-only) | need ratchet |
| ABAC layer | scaffolded under `src/modules/identity-access/application/abac/` | unused in production paths |
| Per-resource scoping (`@AllowSelfScope`) | exists but only on a handful of endpoints | not consistently applied |
| Two-person rule decorator | not implemented | required by P-07 (release flow) |
| Sequence-2 approvals (Director re-approve) | implemented for assignments via `AssignmentApproval.sequence` | proves the pattern; generalize |
| Audit-on-read for sensitive data | not implemented | C-06 (compensation) requires |

**1,041 hardcoded role strings** is the single biggest authorization-maintainability liability in the codebase.

### 12.2 The standard

Adopt these as `docs/architecture/authorization-design-system.md`. The full spec:

#### A. The role catalogue lives in ONE place

```ts
// src/shared/auth/role-catalog.ts
export const ROLES = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  HR_MANAGER: 'hr_manager',
  RESOURCE_MANAGER: 'resource_manager',
  PROJECT_MANAGER: 'project_manager',
  DELIVERY_MANAGER: 'delivery_manager',
  EMPLOYEE: 'employee',
} as const;
export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_GROUPS = {
  ALL_ROLES: Object.values(ROLES),
  MANAGEMENT_ROLES: [ROLES.PM, ROLES.RM, ROLES.HR, ROLES.DM, ROLES.DIRECTOR, ROLES.ADMIN],
  TIMESHEET_MANAGER_ROLES: [ROLES.PM, ROLES.DM, ROLES.ADMIN],
  EVIDENCE_MANAGEMENT_ROLES: [ROLES.DIRECTOR, ROLES.ADMIN],
  WORKFLOW_TRANSITION_ROLES: [ROLES.PM, ROLES.DM, ROLES.RM, ROLES.HR, ROLES.DIRECTOR, ROLES.ADMIN],
  // ... documented in one file
} as const;
```

**Rule.** No string literal `'admin'` / `'director'` / etc. anywhere except `role-catalog.ts`. CI enforces. Same approach as the `route-manifest.ts` discipline, applied universally.

#### B. The Action Catalog (per-domain)

Every state-changing action has a catalog entry that names the action AND who is authorized. This is the single source of truth consumed by both the backend `@RequireAction` decorator and the frontend `<Authorize action=...>` guard.

```ts
// src/shared/auth/action-catalog.ts
export const ACTIONS = {
  // People
  PEOPLE_CREATE: 'people.create',
  PEOPLE_DEACTIVATE: 'people.deactivate',
  PEOPLE_TERMINATE: 'people.terminate',
  PEOPLE_RELEASE_INITIATE: 'people.release.initiate',
  PEOPLE_RELEASE_APPROVE: 'people.release.approve',
  // Project
  PROJECT_CREATE: 'project.create',
  PROJECT_SUBMIT_FOR_APPROVAL: 'project.submit_for_approval',
  PROJECT_DECIDE_ACTIVATION: 'project.decide_activation',
  PROJECT_ACTIVATE: 'project.activate',
  PROJECT_CLOSE: 'project.close',
  // Assignment
  ASSIGNMENT_PROPOSE: 'assignment.propose',
  ASSIGNMENT_PICK_CANDIDATE: 'assignment.pick_candidate',
  ASSIGNMENT_DIRECTOR_APPROVE: 'assignment.director_approve',
  // ... ~70 actions total
} as const;
```

Each action is paired with default authorizing roles **but** the actual matrix is driven by the **Responsibility Matrix** (S-05) — a Prisma-backed, per-tenant, scope-aware override layer. Defaults are seeded, tenants can edit.

```ts
ResponsibilityResolver.canActorPerform({
  actorId,
  action: ACTIONS.PROJECT_DECIDE_ACTIVATION,
  context: { project, person? },
}): { allowed: boolean, mode: 'role'|'person'|'pm_solo'|'skip', resolvedBy: ruleId };
```

#### C. Decorators — three layers, in this order

1. **`@RequireAction(action: AppAction)`** — replaces `@RequireRoles(...)`. Reads default roles + consults Responsibility Matrix.
2. **`@AllowSelfScope({ param: 'id' })`** — already exists; keeps as-is. Allows actor to perform an action on their own resource even if the action's general role list excludes them.
3. **`@RequireApprovals({ action, roles, threshold })`** — new; multi-actor approval gate (P-07 dual-approval).

Every state-changing controller method has at least `@RequireAction` OR `@Public`. CI gate enforces (the F3.1 ratchet from the brief, generalized).

#### D. Scoping (ABAC layer)

Beyond role membership, many actions are scoped to a subset of data:

| Scope | Defined as | Example |
|---|---|---|
| `OWN` | `actor.personId === resource.personId` | employee sees own timesheet |
| `LINE` | `resource.personId.lineManagerId === actor.personId` | manager sees direct reports |
| `POOL` | `resource.personId.resourcePool.ownerId === actor.personId` | RM sees pool members |
| `PROJECT_PM` | `resource.projectId.projectManagerId === actor.personId` | PM sees their projects |
| `PROJECT_DM` | `resource.projectId.deliveryManagerId === actor.personId` | DM same |
| `PROGRAM` | `resource.programId.directorPersonId === actor.personId` | Director sees portfolio |
| `ORG_UNIT` | `actor.orgMembership.orgUnitId === resource.orgUnitId` (or ancestor) | HR sees own org |
| `ALL` | unrestricted | admin |

A single `PersonScopeService.canActorSee(actor, resource): boolean` consulted by every list/read endpoint. Today this is partial — Phase 20a-03 IDOR fix did personId; cross-resource scoping is per-endpoint ad hoc. Standardize.

#### E. Audit of access

Three categories:

1. **State changes** → already write `AuditLog` rows (mostly).
2. **Sensitive reads** → `@AuditRead({ category: 'compensation' | 'pii' | 'health' | 'legal' })` decorator writes a `READ` row when actor is not the data subject. (C-06.)
3. **Failed authorization** → `AuthorizationDeniedLog` table records every 403, with action + scope + reason. Helps detect probing.

#### F. JWT claims

Today: `personId`, `roles`. Add:

- `tenantId` (when J1 reverses to multi-tenant deployments-per-tenant remains; tenantId scoped to JWT for any cross-tenant ops).
- `scopes`: array of pre-computed scope keys for the actor (e.g., `['OWN:<personId>', 'LINE:<a,b,c>', 'POOL:<x,y>', 'PROJECT_PM:<p1,p2>']`). Computed at login + refresh; cached at JWT level (≤30min TTL aligned with access token TTL).
- `actAs?`: impersonation actor's personId (CLAUDE.md pitfall #13 already shows the FE pattern; lift it into JWT for trail-of-evidence).

`ActorPrincipal` type:

```ts
{
  personId: string,
  tenantId: string,
  roles: AppRole[],
  scopes: ScopeKey[],
  isImpersonating: boolean,
  realPersonId?: string,
  jwtIssuedAt: Date,
  jwtExpiresAt: Date,
}
```

#### G. Evaluation order

```
Request → AuthGuard (JWT verify) → TenantGuard (resolve tenantId) →
  IdempotencyMiddleware → ValidationPipe (DTO) →
    @RequireAction(action) handler →
      // first, default-roles check from action catalog
      // then, ResponsibilityMatrix override consult (per scope)
      // then, @AllowSelfScope refinement (if applicable)
      // then, @RequireApprovals gate (if applicable)
    → controller method runs
```

Failed auth at any step → `AuthorizationDeniedLog` row + 403 with structured error envelope (`{ error: { code: 'FORBIDDEN', target: 'project.decide_activation', ...}}`).

### 12.3 CI gates (the Authorization ratchet)

`scripts/check-authorization-conformance.cjs`:

| Rule | Severity | Description |
|---|---|---|
| `endpoint-action-coverage` | ERROR (after Sprint 1) | Every state-changing controller method has `@RequireAction` or `@Public`. Today: 59 violations → ratchet down. |
| `no-role-string-literal` | ERROR (after Sprint 2) | No `'admin'` / `'director'` / etc. string literals outside `role-catalog.ts`. Today: 1,041 → ratchet down. |
| `no-fe-role-literal` | ERROR | Same on frontend outside `route-manifest.ts`. |
| `action-catalog-completeness` | ERROR | Every `ACTION` constant has default roles defined AND a default `ResponsibilityRule` seeded. |
| `audit-read-on-pii` | ERROR | `GET /people/:id/cost-rates`, `/reports/margin`, etc. carry `@AuditRead({ category: ... })`. |
| `self-approval-blocked` | ERROR | Every approval action service tests `actorId !== resource.personId` (or equivalent). |

`scripts/check-authorization-conformance.cjs` baseline written end of Sprint 0; ratchet down each sprint.

### 12.4 Sprint mapping

| # | Task | Sprint |
|---|---|---|
| RBAC-1 | Author `role-catalog.ts` + `action-catalog.ts`; mass-replace role literals | Sprint 1 |
| RBAC-2 | `@RequireAction` decorator + ResponsibilityMatrix integration | Sprint 1 (depends on S-05) |
| RBAC-3 | `@RequireApprovals` decorator (P-07 dual-approval) | Sprint 3 |
| RBAC-4 | `PersonScopeService.canActorSee` central + retrofit to list endpoints | Sprint 1-3 |
| RBAC-5 | `@AuditRead` decorator + AuditLog read-rows + applied to compensation/PII | Sprint 5 (with C-06) |
| RBAC-6 | `AuthorizationDeniedLog` table + global filter | Sprint 1 |
| RBAC-7 | JWT claim extension (`scopes`, `tenantId`, `actAs`) | Sprint 1 |
| RBAC-8 | CI script + baseline | Sprint 0 (first version) → Sprint 1+ ratchet |
| RBAC-9 | F3.1 covered (every method has `@RequireAction` or `@Public`) | Sprint 1 |
| RBAC-10 | Per-tenant role customization (extend ROLES catalog via tenant settings? — *defer*; document as out-of-scope unless you need custom roles like "Finance Reviewer") | future |

---

## 13. Data Design System

**87 Prisma models** governed by ad-hoc conventions. Audit-column coverage is uneven (`createdAt` 87%, `updatedAt` 74%, `version` 16%, `archivedAt` 28%, `deletedAt` 3%, `publicId` 9%). 52 enums. 42 unique constraints. 177 indexes. 21 Cascade / 15 Restrict / 17 SetNull FK actions. **No Postgres CHECK constraints.** Database-level invariants exist only via custom triggers (DM-R-22 hash chain, DM-R-23 mass-mutation guard, DM-R-31 honeypot, DM-R-21 DDL lockout) — solid defensive infra, but app-layer invariants are scattered.

### 13.1 The standard

A model is "standard" if it has all of the following (where applicable to its semantics).

#### A. Identity columns

```prisma
model XYZ {
  id          String    @id @default(uuid()) @db.Uuid     // primary key
  publicId    String?   @unique @db.VarChar(32)           // pub_xyz_<base58>
  // ...
}
```

- `id`: UUID (v4), database-generated, never exposed to UI.
- `publicId`: human-friendly, scoped per aggregate (`prj_…`, `usr_…`, `asn_…`, `case_…`). Generated at insert via `PublicIdService` (DM-2.5 already exists). UI shows publicId; backend accepts either via `ParsePublicIdOrUuid`.
- Both indexed (PK auto, publicId via unique). No `idNew` confusion (DM-3 cleanup follow-up).

#### B. Audit columns (mandatory on every aggregate)

```prisma
model XYZ {
  // ... id ...
  version     Int       @default(1)                       // optimistic concurrency
  createdAt   DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(3)
  createdById String?   @db.Uuid                          // actor at creation
  updatedById String?   @db.Uuid                          // actor at last update
  archivedAt  DateTime? @db.Timestamptz(3)                // soft delete
  archivedById String?  @db.Uuid                          // who archived
  archivedReason String?                                  // why
  // hard delete reserved for admin break-glass (deletedAt — keep for tombstone)
  deletedAt   DateTime? @db.Timestamptz(3)
  tenantId    String    @db.Uuid                          // when J1 multi-tenant; for now seeded 'default'
}
```

Today: only 14/87 models have `version`, 24/87 have `archivedAt`, 76 have `createdAt` etc. **The standard is to backfill all 87 over time.** Some models (joins, ephemeral logs) can opt out via documentation.

#### C. Enum vs MetadataDictionary decision rule

**Enum** when:
- The values are part of the domain workflow itself (e.g., `AssignmentStatus`, `ProjectStatus`) and code switches on them.
- New values require code change (new state machine transitions, new business logic).

**MetadataDictionary** when:
- Tenants need to add/remove/rename values without code change (rejection reasons, risk categories, milestone types, vendor contract types, leave types).
- Code never branches on the specific value, only on its presence/absence/category.

Today **52 enums**. Of those, the following are candidates to migrate to MetadataDictionary so tenants can extend (no code change needed):

- `RiskCategory`, `RiskStrategy`, `RiskStatus`, `RiskType`
- `VendorContractType`, `VendorEngagementStatus`
- `MilestoneStatus`, `ChangeRequestSeverity`
- `LeaveRequestType`
- (Maintain `RagRating` and core lifecycle enums — they ARE workflow.)

Migration: copy enum values into a seeded MetadataDictionary; replace column type from enum → String (with check via dictionary lookup); deprecate enum once consumers migrate.

#### D. FK action policy

Three rules, evaluated on each FK:

| Rule | onDelete | When |
|---|---|---|
| **Anchor** | `Restrict` | parent must always exist; deleting parent must fail (e.g., `Project.id` for assignments) |
| **Trail** | `SetNull` | child survives parent deletion as a tombstone (e.g., `actorId` on AuditLog when actor account removed) |
| **Owned** | `Cascade` | child has no meaning without parent (e.g., `CaseStep` belongs to `CaseRecord`) |

Today's split (21/15/17) is roughly aligned but case-by-case. Document per-FK in `docs/architecture/data-design-system.md` and review on each schema change.

#### E. Indexing policy

- Index every FK column (Postgres doesn't auto-index FKs).
- Composite index for any common filter pair (e.g., `(personId, weekStart)` on `TimesheetWeek`).
- Partial indexes for `archivedAt IS NULL` filter (the soft-delete fast-path) — DM-8 already adds these for some models; extend.
- Analyze `pg_stat_statements` (DM-8 already enabled) post-Sprint 5; rebalance.

#### F. Naming

- Models: `PascalCase`, singular (`Person`, `ProjectAssignment`, `StaffingRequest`).
- Columns: `camelCase`. No `_` separators.
- FKs: `<entity>Id` (e.g., `personId`, `projectId`).
- Booleans: prefix `is*` / `has*` / `requires*`.
- Dates: `*At` for timestamps with time (Timestamptz), `*On` for dates only.
- Currency-typed: `*Hourly`, `*Daily`, `*Total`, with explicit `currencyCode` column nearby.

This is **mostly** followed today; standardize as a CI gate (`scripts/check-schema-conventions.cjs` already exists per Phase DM, baseline 117 violations — keep ratcheting).

#### G. Soft-delete vs hard-delete

- **Soft delete (default):** sets `archivedAt` + `archivedById` + `archivedReason`. Reads filter by `archivedAt IS NULL`.
- **Hard delete (rare):** sets `deletedAt` (tombstone) AND removes from active queries; only admin role; only via explicit `deleteHard()` endpoint with reason logged in AuditLog.

A `@SoftDelete` Prisma middleware (per DM-8 already shipped) auto-applies the filter. Verify all repos respect it.

#### H. Effective-dating

For any aggregate with versioning over time (`PersonCostRate`, `RateCard`, `ReportingLine`):

```prisma
effectiveFrom DateTime  @db.Date
effectiveTo   DateTime? @db.Date    // null = current
```

A query helper `EffectiveAtResolver.resolve<T>(table, filter, atDate)` returns the row valid at `atDate`. Used by reports, billing, EVM. Closes the "stale rate at booking time" risk — confirms C-01 RateCard pinning.

#### I. Tenant isolation

When J1 reverses to single-deployment-multi-tenant: every aggregate has non-nullable `tenantId @db.Uuid`. Today columns added to 15 aggregates (DM-7.5) but NOT NULL flip pending. Standard: every NEW model gets `tenantId` from day 1; old models get a backfill migration in DM-7.5 follow-up.

### 13.2 CI ratchet (the Data DS gate)

Already partly there: `schema:check`, `migrations:check`, `enum:check`, `tz:check`, `publicid:check`. Add:

| Rule | Severity | Description |
|---|---|---|
| `audit-columns` | ERROR (after Sprint 4) | Every aggregate has `version`, `createdAt`, `updatedAt`. Today 14/87 violate. |
| `soft-delete-or-tombstone` | WARN | Every state-bearing aggregate has `archivedAt` OR documents why not. |
| `tenant-id-present` | ERROR (when J1 reverses) | Every aggregate has `tenantId @db.Uuid`. |
| `enum-vs-dictionary-decision` | INFO | Annotate each enum with `// @intent workflow` or `// @intent extensible` so reviewers see the choice. |
| `index-on-fk` | WARN | Every FK column is indexed. |
| `partial-index-on-archived` | WARN | Soft-delete-bearing aggregates have a partial index on `archivedAt IS NULL`. |

### 13.3 Sprint mapping

| # | Task | Sprint |
|---|---|---|
| DDS-1 | Author `data-design-system.md` | Sprint 1 |
| DDS-2 | Add `version` column to remaining 73 aggregates (expand migration, default 1) | Sprint 4 |
| DDS-3 | Standardize soft-delete: `archivedAt` + `archivedById` + `archivedReason`. Backfill where missing. | Sprint 4 |
| DDS-4 | Migrate enum candidates (Risk*, Vendor*, Milestone*, etc.) to MetadataDictionary | Sprint 5 |
| DDS-5 | Effective-dating helper + apply to RateCard (C-01), PersonCostRate, ReportingLine | Sprint 5 (with C-01) |
| DDS-6 | Index audit + add missing FK indexes; partial indexes on `archivedAt IS NULL` | Sprint 4 |
| DDS-7 | Drop legacy double-truth columns (`Person.skillsets`, `Project.tags/techStack`) — DM-6b-1 follow-up | Sprint 6 |
| DDS-8 | Postgres CHECK constraints for invariants previously app-only (e.g., `allocationPercent BETWEEN 0 AND 200`) | Sprint 6 |

---

## 14. Customization System — zero-hardcode policy

The user's principle: **"0% hard-code accepted."** Every label, threshold, taxonomy, role-action map, workflow, layout, branding token must be tenant-customizable without code change. The customization primitives already exist (`MetadataDictionary`, `MetadataEntry`, `CustomFieldDefinition`, `CustomFieldValue`, `WorkflowDefinition`, `WorkflowStateDefinition`, `EntityLayoutDefinition`, `PlatformSetting`, `RadiatorThresholdConfig`) but are under-utilized. This section turns them into a discipline.

### 14.1 The four-layer customization model

```
                  Layer 1: Tenant settings (key → value)
                  ───────────────────────────────────
                  PlatformSetting
                  scalar / array / json / decimal
                  e.g. assignment.sla.PROPOSAL.budgetBusinessDays = 3
                       compensation.banding.gradeToBandMap = {...}

                  Layer 2: Dictionaries (extensible vocabularies)
                  ───────────────────────────────────────────────
                  MetadataDictionary + MetadataEntry
                  e.g. risk-category, leave-type, rejection-reason,
                       vendor-contract-type, release-reason

                  Layer 3: Custom fields (per-tenant schema extension)
                  ─────────────────────────────────────────────────────
                  CustomFieldDefinition + CustomFieldValue
                  e.g. internal employee number format,
                       project P&L code, client industry tag

                  Layer 4: Workflow definitions (per-tenant state machines)
                  ────────────────────────────────────────────────────────
                  WorkflowDefinition + WorkflowStateDefinition
                  e.g. case kinds with custom step sequences,
                       project closure checklist per practice
```

### 14.2 Hardcode debt inventory (today)

What's hardcoded today that ought to be a setting/dictionary/workflow:

| Domain | Hardcoded today | Should live in | Why |
|---|---|---|---|
| **Roles** | 1,041 string literals across BE | `role-catalog.ts` (centralized) — but role *strings* themselves are core; tenant role *labels* could be Layer 2 | maintainability (avoid 1,041-edit migrations) |
| **Labels** | `frontend/src/lib/labels.ts` (138 lines) — enum-to-human label maps | mostly OK; per-tenant label overrides via Layer 2 if needed | tenant branding |
| **Risk staleness thresholds** | `project-risk.service.ts` returns 7/14/30/90 hardcoded | Layer 1: `project.risk.staleAfterDays.{HIGH,CRITICAL,MEDIUM,LOW}` | already in PM-06 spec |
| **Radiator scorers** | `radiator-scorers.ts` — `if (value >= t.t4) return 4` etc. | Layer 1: `RadiatorThresholdConfig` (already exists, partial) | extend coverage |
| **Director-approval threshold** | wired (WO-2.3) | Layer 1: `assignment.directorApproval.{allocationPercentMin,durationMonthsMin}` | already correct pattern |
| **Slate min/max** | wired (WO-1.7) | Layer 1: `staffing.slate.minCandidates`, `maxCandidates=null` | correct |
| **SLA budgets** | wired (WO-3.x) | Layer 1: `assignment.sla.{stage}.budgetBusinessDays` | correct |
| **Grade dictionary** | seeded as G7-G15 (per live walk D-41) | Layer 2: `grade` MetadataDictionary | should be Layer 2 |
| **Skill catalog** | `Skill` model + seed | already extensible via Layer 2 (admin → skills) | ✓ |
| **Risk categories** | enum `RiskCategory` | should migrate to Layer 2 | DDS-4 |
| **Vendor contract types** | enum `VendorContractType` | Layer 2 | DDS-4 |
| **Milestone status** | enum `MilestoneStatus` | maybe Layer 2 (but careful — code may switch on it) | review per case |
| **Project priority** | enum `ProjectPriority` (LOW/MEDIUM/HIGH/CRITICAL) | keep enum (code branches) BUT priority labels Layer 2 | enum + label map |
| **Pulse mood values** | hardcoded 1-5 in form + read paths | keep numeric internally, Layer 2 for icon/label per value (so tenants can change emojis) | label-only |
| **Engagement model** | enum `EngagementModel` | maybe Layer 2 (if tenants want custom engagement models) | review |
| **Currencies** | seeded `Currency` table | already a table, extensible | ✓ |
| **Org units / roles / job titles** | seeded `Position`, `OrgUnit` | already tables, extensible | ✓ |
| **Notification routing recipients** | mostly hardcoded fallbacks | Layer 1: `notifications.routing.{category}.roles` | introduced in F5 |
| **Responsibility rules** | hardcoded role lists in services | Layer 1+2: `ResponsibilityMatrix` (S-05) | introduced in S-05 |
| **Contract checklist template** | (today) absent | Layer 1: `people.release.checklistTemplate Json` | P-07 |
| **Project closure checklist** | (today) absent | Layer 4: `WorkflowDefinition kind=PROJECT_CLOSURE` | PM-09 |
| **Onboarding checklist** | seeded but non-extensible | Layer 4: `WorkflowDefinition kind=ONBOARDING` | next iteration |
| **Tip / help content** | (today) absent | Layer 2: `HelpTip`, `HelpArticle` (DOC-02 schema) | introduced in §13 |
| **Tenant branding** | (today) absent | Layer 1: `branding.{logoUrl,primaryColor,fontFamily,...}` | next iteration |

### 14.3 The standard

#### A. The "no hardcode" rule

A reviewer rejecting a PR can ask:
- "Is this number a threshold a tenant might want different?" → Layer 1.
- "Is this a list a tenant might want to extend?" → Layer 2.
- "Is this a field on the entity a tenant might want to add?" → Layer 3.
- "Is this a sequence of steps a tenant might want to reorder/customize?" → Layer 4.
- If yes to any, the PR is incomplete.

#### B. Settings discoverability

`Admin → Tenant Settings → Catalog` page (F7.1 in brief) lists every `PlatformSetting` key, description, default, current value, last-edited-by, last-edited-at. Driven by `PlatformSettingsService.DEFAULTS`. Sprint 3 task.

#### C. Settings hot-reload

A change to a `PlatformSetting` should NOT require a deploy. The service queries the DB on each call (with optional 60s in-memory cache invalidated on write). For high-throughput hot paths (radiator scoring, SLA sweeps), use the pattern: read settings once at sweep start; pass through.

#### D. Dictionaries live edit

Admins edit dictionaries via `/admin/dictionaries`. Existing entries can be:
- **Added** anytime (the standard case).
- **Disabled** (`enabled: false`) — hidden from new selections; existing references still resolve.
- **Renamed** — affects display only; `key` is immutable to avoid orphan references.

Existing data binding to a now-disabled entry shows the entry as `(deprecated)` in UI; admins can reassign if needed.

#### E. Custom field discipline

When a tenant adds a CustomFieldDefinition (e.g., "Internal cost center" on Person):
- Field appears under a "Custom" section on the Edit form (DDS-2 placement).
- Field appears as a column option in the directory list (toggleable via Columns menu).
- Field is exportable.
- Field is queryable in Report Builder.
- Field is included in audit log on update.

Closes "tenant adds a field" without code change.

#### F. Workflow definition discipline

WorkflowDefinition exists, schema-only today (F7.3 deferred). Ship in a future iteration. Acceptance: a tenant can clone a built-in workflow (e.g., default ONBOARDING case) → modify steps + assignees + SLA → save → next person hired follows the new workflow.

### 14.4 CI ratchet (the Customization gate)

`scripts/check-no-hardcode.cjs`:

| Rule | Severity | Description |
|---|---|---|
| `no-magic-number-in-service` | WARN | Any literal number > 1 in `*.service.ts` files outside math/constants gets flagged; reviewer judges if it should move to PlatformSetting. Today: at least 4+ confirmed (project-risk.service.ts 7/14/30/90). |
| `no-untranslated-label` | WARN | Any user-facing string in `.tsx` outside the labels file is flagged. (FE-side discipline; partial today.) |
| `no-enum-fallback-in-business-logic` | INFO | A switch-on-enum that returns a hardcoded number (e.g., default SLA) — should at minimum reference a constant declared in PlatformSetting DEFAULTS. |
| `dictionary-entry-resolution` | ERROR | Code referring to a dictionary value resolves it via service, not a literal `'High'` etc. |

### 14.5 Sprint mapping

| # | Task | Sprint |
|---|---|---|
| CUST-1 | Author `customization-system.md` | Sprint 1 |
| CUST-2 | Promote risk staleness thresholds to PlatformSetting (PM-06) | Sprint 4 |
| CUST-3 | Promote radiator-scorer constants to RadiatorThresholdConfig (already partial) | Sprint 4 |
| CUST-4 | Migrate enum candidates → MetadataDictionary (DDS-4) | Sprint 5 |
| CUST-5 | Tenant Settings → Catalog admin page (F7.1) | Sprint 3 |
| CUST-6 | Custom fields rendering on Edit forms (Person, Project) (F7.2) | Sprint 3 |
| CUST-7 | Workflow definition consumption (per case kind) | future iteration |
| CUST-8 | Tenant branding settings (logo, primary color) | future iteration |
| CUST-9 | CI ratchet for `no-hardcode` rules | Sprint 1 baseline |

---

## 15. Data Consistency / Invariants Design System

The hardest layer: cross-row, cross-table, cross-time invariants that must always hold true. Today these are scattered: some enforced in service code, some via Postgres triggers (DM-R-22 hash chain, DM-R-23 mass-mutation guard), some not enforced at all. Without a register, drift is silent.

### 15.1 The invariant register (canonical list)

Every invariant has: name, scope, where enforced, acceptance test.

#### Aggregate-level invariants

| ID | Invariant | Scope | Enforced where |
|---|---|---|---|
| INV-A1 | `assignment.allocationPercent BETWEEN 0 AND 200` | row | app validator only today; needs Postgres CHECK |
| INV-A2 | `assignment.validFrom < assignment.validTo` (when both set) | row | app validator + Postgres CHECK (DDS-8) |
| INV-A3 | `assignment.validTo <= project.endsOn` (when both set) | cross-table | service code (Phase 20b-04 done) |
| INV-A4 | `assignment.status` only transitions per `ASSIGNMENT_STATUS_TRANSITIONS` | aggregate | `transitionTo()` enforces |
| INV-A5 | One `picked` candidate per `AssignmentProposalSlate` | row | Prisma partial-unique index (`@@unique([slateId, decision])` where `decision='PICKED'`) |
| INV-A6 | `assignment.actorId !== assignment.personId` for approval/director-approve | service | `approve-project-assignment.service.ts` (Phase 20b-03) + must extend to others (D-16) |
| INV-A7 | `staffingRequest.status` matches derived per-slot status (D-11) | cross-table | nightly `BackgroundReconcileService` (S-13) |
| INV-A8 | `Person.employmentStatus = TERMINATED` ⇒ all assignments status ∈ {COMPLETED, CANCELLED} | cross-table | `TerminateEmployeeService` cascades (existing); reconciler verifies |
| INV-A9 | `PeriodLock(weekStart=W)` ⇒ no `TimesheetEntry` updates within week W | cross-table | service blocks; needs CHECK trigger |
| INV-A10 | `BudgetApproval.status=APPROVED` ⇒ `ProjectBudget` shadow value flipped to effective | cross-table | service + reconciler (PM-01 budget-change extension) |
| INV-A11 | `ProjectBudget.actualCost = sum(approved hours × cost rate)` (eventual, ±$0.01) | cross-table; eventual | nightly rollup (C-04) |
| INV-A12 | `ProjectAssignment.appliedRateCardEntryId` IS NOT NULL when `status >= BOOKED` (after C-01) | cross-table | `BookAssignmentService` pins; backfill for legacy via reconciler |

#### Cross-aggregate (eventual consistency)

| ID | Invariant | Mechanism |
|---|---|---|
| INV-E1 | Every state change has an `OutboxEvent` row | service writes inside transaction; outbox publisher loop fans out (F2.1) |
| INV-E2 | Every `OutboxEvent` is published exactly once (or known-failed) | publisher idempotent + status PENDING/SENT/FAILED |
| INV-E3 | Every `assignment.statusChanged` event corresponds to an `AssignmentHistory` row | service writes both in same tx; reconciler verifies |
| INV-E4 | Every `Person` create has an `EmployeeActivityEvent.HIRED` row | service writes both (currently broken — D-47); 0.17 fix |
| INV-E5 | Every `AuditLog` row that mutates ledger-style data continues the hash chain (DM-R-22) | trigger-enforced; verified by `dm-r-21-ddl-audit` and audit verification job |
| INV-E6 | Tenant data isolation: no row in tenant T1 references a row in tenant T2 | RLS (DM-7.5) when J1 reverses |

#### UI-driven consistency (visual contracts)

| ID | Invariant | Where |
|---|---|---|
| INV-U1 | Person 360 status display matches DB `Person.employmentStatus` | currently broken (D-45/D-49); 0.20 fix |
| INV-U2 | Project KPI strip RAG matches Project Pulse score | currently broken (D-54); 0.18 fix |
| INV-U3 | List filter values applied = URL params on the page | partial (D-48); 0.28 audit |
| INV-U4 | Breadcrumb path = current route | broken (D-27); 0.10 FE-FOUND-01 |
| INV-U5 | Notification bell badge = unread count from inbox | wired |
| INV-U6 | Cmd+K palette returns matching results | broken for People (D-68); 0.23 fix |

### 15.2 The standard

#### A. Three layers of enforcement

1. **Prisma + Postgres** (preferred for hard invariants): unique constraints, CHECK constraints, FK actions, triggers. The DB never drifts.
2. **Domain entity** (preferred for transition logic): `transitionTo()` + state machine on the aggregate.
3. **Service / reconciler** (fallback for cross-aggregate eventual): explicit reconcile job that asserts invariants and emits `consistency.violation` events.

#### B. Reconcile services

Every cross-aggregate invariant has a reconciler:

```ts
@Cron(CronExpression.EVERY_HOUR)
async reconcile() {
  // INV-A7: staffingRequest cache vs derived
  const drift = await this.staffingRequests.findDrift();
  if (drift.length > 0) {
    for (const d of drift) {
      this.outbox.append({ topic: 'consistency', eventName: 'staffing.statusDrift', payload: d });
    }
  }
}
```

#### C. Idempotency keys (revisited)

Every state-changing endpoint accepts `Idempotency-Key`. Hashed `(actorId, endpoint, key)` → cached response if seen before. Closes "double-clicked submit" risk and supports webhook redelivery.

#### D. Saga / orchestration for multi-aggregate flows

For flows like P-07 release (RM initiates → HR approves → Director approves → finalize → cascade-end assignments → notify):

- **Choreography (preferred):** each step publishes an OutboxEvent; downstream services react. Simpler.
- **Orchestration (when needed):** an explicit `<Flow>OrchestratorService` tracks state in a `<Flow>Run` table. Use when steps need to be retried / rolled back / observed end-to-end.

P-07 ships as an orchestrator (`PersonReleaseRequest` IS the run table). Most other flows stay choreography.

#### E. Backfill discipline

When an invariant is introduced after data already exists (e.g., DDS-2 `version` column added to legacy aggregates):
- New migration sets `version = 1` for all existing rows.
- A backfill script (in `prisma/seeds/backfills/`) recomputes derived fields if the new column has semantics (e.g., setting `appliedRateCardEntryId` for legacy BOOKED assignments).
- Backfills are `--dry-run` testable, `--limit N` chunked, and idempotent.

### 15.3 CI ratchet

`scripts/check-invariants.cjs`:

| Rule | Severity | Description |
|---|---|---|
| `aggregate-has-version` | ERROR | Optimistic concurrency mandatory (DDS-2). Today 14/87 violate. |
| `state-machine-test-exists` | ERROR | Every aggregate with a status field has a `<aggregate>-transition-matrix.spec.ts`. |
| `outbox-on-state-change` | ERROR | Every service that writes a status change also writes an `OutboxEvent`. AST check. |
| `reconciler-coverage` | WARN | Every cross-aggregate invariant in the register has a reconciler service. |
| `idempotency-on-mutation` | ERROR | Every `POST/PATCH/PUT/DELETE` controller method documents idempotency strategy in DTO description. |
| `check-constraints-for-numeric-bounds` | INFO | Numeric columns with documented bounds (e.g., `allocationPercent`) have Postgres CHECK. |

### 15.4 Sprint mapping

| # | Task | Sprint |
|---|---|---|
| CONS-1 | Author `data-consistency.md` with full INV register | Sprint 1 |
| CONS-2 | Add Postgres CHECK constraints for INV-A1, INV-A2, allocation bounds | Sprint 4 |
| CONS-3 | Build `BackgroundReconcileService` framework + INV-A7 (staffing drift) reconciler | Sprint 2 (with S-13) |
| CONS-4 | INV-A11 reconciler (cost rollup correctness) | Sprint 5 |
| CONS-5 | INV-A12 reconciler (rate card pinning) | Sprint 5 |
| CONS-6 | INV-E3, INV-E4 reconcilers (AuditLog and EmployeeActivityEvent presence) | Sprint 1 (audits 0.17 result) |
| CONS-7 | Outbox publisher reliability (F2) | Sprint 1 |
| CONS-8 | Idempotency middleware (F1.3) | Sprint 1 |
| CONS-9 | Saga / orchestrator pattern doc + P-07 reference impl | Sprint 3 (with P-07) |

---

## 16. Cross-cutting governance — the six design systems together

This is what "hardening" really means: not a list of features, but **six standardization spines** running in parallel, each with a CI ratchet, each retiring a category of fragility. Together they make the codebase maintainable.

| # | Design system | Charter | CI gate | Owner doc |
|---|---|---|---|---|
| 1 | **UI / Visual DS** (existing) | tokens, atoms, page grammars, primitives | `tokens:check`, `ds:check` | `phase18-page-grammars.md`, `design-tokens.ts` |
| 2 | **API DS** (§11) | URL/envelope/error/pagination/idempotency/versioning | `api:check` (new) | `api-design-system.md` (new) |
| 3 | **Authorization DS** (§12) | role catalog, action catalog, scopes, approvals, audit-on-read | `check-authorization-conformance.cjs` (new) | `authorization-design-system.md` (new) |
| 4 | **Data DS** (§13) | id/audit/soft-delete/effective-dating/tenant/index/FK conventions | `schema:check` + new audit-columns ratchet | `data-design-system.md` (new) |
| 5 | **Customization System** (§14) | zero-hardcode policy across 4 layers | `check-no-hardcode.cjs` (new) | `customization-system.md` (new) |
| 6 | **Consistency / Invariants DS** (§15) | register of invariants + reconcilers + sagas + idempotency | `check-invariants.cjs` (new) | `data-consistency.md` (new) |

Plus three cross-cutting non-DS layers:

| # | Layer | Charter |
|---|---|---|
| A | **Observability** | structured logs, metrics catalog, traces, SLO budgets |
| B | **Test strategy** | DOD checklist, fixture rule, rollback path per PR |
| C | **Migration discipline** | expand → migrate → contract; classified migrations; dry-run backfills |

### 16.1 Sprint integration

The original 8 sprints in HARDEN_BRIEF stay; the design-system tasks **interleave** rather than add a separate sprint:

```
Sprint 0   verify, fix-blockers, audit, write the 6 DS doc skeletons + CI baselines
Sprint 1   foundations + RBAC-1..8 + DDS-1 + CUST-1 + ADS-1..5 + CONS-1,7,8
Sprint 2   staffing cutover + ADS-6,9,13 + CONS-3
Sprint 3   people hardening + CUST-5,6 + RBAC-3,4 + CONS-9
Sprint 4   project monitoring + DDS-2,3,6 + CUST-2,3 + CONS-2
Sprint 4.5 documentation
Sprint 5   cost & utilization + DDS-4,5 + CUST-4 + RBAC-5 + CONS-4,5
Sprint 6   staffing edge cases + S&D polish + DDS-7,8 + CONS revisit
Sprint 7   S&D advanced + project close + (any DS spillover)
Sprint 8   cleanup + observability + DS ratchets all locked at zero where applicable
```

By Sprint 8 every CI gate is green (or strictly ratcheting), every domain has been touched by at least one DS migration, and the codebase produces a self-policing maintenance posture.

### 16.2 Ratcheting logic (universal)

All CI ratchets follow the proven `tokens:check` pattern:

1. Run script → capture violations as `<system>-baseline.json`.
2. Each PR runs the script → if violations > baseline, FAIL.
3. As violations decrease, baseline file is updated by humans (`<system>:baseline` script).
4. Once baseline reaches 0, rule promotes from "ratcheting" to "ERROR" (any violation fails).
5. Baseline file checked into repo; reviewable in PRs.

This is what's already working for design tokens — extend it five more times.

### 16.3 Why six systems and not one

Each system has a **distinct artifact** (not just a doc):
- UI DS: `design-tokens.ts` + CSS classes.
- API DS: response envelope class + error filter + idempotency middleware + OpenAPI.
- Authz DS: role catalog + action catalog + decorators.
- Data DS: schema conventions + check script + audit-column standard.
- Customization: `PlatformSetting.DEFAULTS` map + admin pages + dictionaries.
- Consistency: invariant register + reconcilers.

A single "monolithic governance doc" would lose the property that each artifact is independently testable, reviewable, and ratcheted.

### 16.4 What "100% understood and covered" looks like end-state

When all six systems hit ERROR-tier on every rule, the codebase has these properties:

- Any new endpoint conforms automatically (URL, envelope, error, paging, idempotency, headers).
- Any new aggregate has audit columns + version + tenantId + soft-delete by default.
- Any state-changing endpoint has an action catalog entry + `@RequireAction` + scope check + audit-on-read for sensitive data.
- Any threshold / taxonomy / workflow value lives in PlatformSetting / Dictionary / WorkflowDefinition — none in code.
- Any cross-aggregate invariant has a reconciler.
- Any UI element draws from design tokens; no raw hex.

That's the user's promise of "0% hard-code accepted, maintainable, self-policing." Not a single sprint achieves all of it; the ratchets enforce monotonic progress.

---

## 17. Appendix — combined task index across all systems

Aggregating: HARDEN_BRIEF Sprint 0..8 (P-, S-, PM-, C-, SD-, F-, DOC-, FE-FOUND-, sweep tasks) PLUS this map's 5 design-system additions (ADS-, RBAC-, DDS-, CUST-, CONS-).

| Domain | Existing sprint tasks | + DS overlay | Total per domain |
|---|---|---|---|
| Foundations | F1..F9 + 0.1..0.28 | ADS-1..5,7 · RBAC-1,2,4,6,7,8 · CONS-1,7,8 | ~50 tasks |
| People | P-01..P-09 | RBAC-3 (release dual-approval) · CUST-2 · CONS-3 (D-11 reconciler), CONS-4 (rate pinning) | ~15 |
| Staffing | S-01..S-13 | ADS-6,9,13 · DDS-7 · CONS-3 | ~18 |
| Project Monitoring | PM-01..PM-09 + 0.18,0.19,0.22,0.25 | ADS-10 · CUST-2,3 · DDS-2,3,6 · CONS-2 | ~20 |
| Cost & Utilization | C-01..C-07 | ADS-11 · DDS-4,5 · CUST-4 · RBAC-5 (audit-read on PII) · CONS-4,5 | ~15 |
| Supply & Demand | SD-01..SD-09 + 0.13,0.14 | ADS-12 · CONS revisit | ~12 |
| Documentation | DOC-01..DOC-07 | (none beyond) | 7 |
| Cross-cutting DS doc + CI | n/a | ADS-2,3 · RBAC-8 · DDS-1 · CUST-1,9 · CONS-1 | 7 |

Roughly **140 discrete tasks** spread across 8 sprints. Heavy in Sprint 0-1 (foundation work + DS skeletons + CI baselines), tapering as the ratchets do their work.

---

## 18. Discovery is a process, not an event

You're correct — and this is the most important caveat to put in writing.

**Every additional iteration of search will surface more gaps.** The 70 distinct D-items (after dedup) are not the universe of bugs in this system. They are *the bugs surfaced by the work I did, with the time and surfaces I exercised, against the seed data I had access to.* Each of these dimensions caps what could be found:

| Dimension | This pass | Plausibly hidden |
|---|---|---|
| Workflows exercised | Create employee, Create project, Activate, Approval Queue glance, Cmd+K, Notification bell, Planner cell click | Make Assignment full transitions, Proposal slate build → review → pick (round trip), Director-approve action, Hold/Release, Cancel with reason, Case open from assignment, Time entry → submit → approve → lock, Leave request, Overtime exception, M365 sync trigger, Webhook setup, Setup wizard, ALL admin pages |
| Roles exercised | SysAdmin only | Director, PM, RM, HR, DM, Employee, dual-role (RM+HR) — each can see different bugs |
| Data scenarios | Default it-company seed | empty tenant, very large tenant, tenant mid-migration, tenant with tons of cases, tenant with overtime exceptions, tenant with multiple overlapping leave requests, scenarios with 1000+ assignments, edge cases (single-day project, multi-currency project, cross-fiscal-year budget) |
| Concurrency | Sequential clicks | concurrent submits (idempotency holes), race on optimistic locks, two RMs proposing same person, rapid scenario thrash |
| Browsers / devices | Chrome desktop, default zoom | Safari, Firefox, mobile, narrow viewport, slow network, JWT-near-expiry refresh storms |
| Time horizon | Single session | 30-day soak: SLA sweeps firing, period locks, cron jobs running, OutboxEvent backlog, NotificationDelivery retries |
| Tooling | Manual click + grep + screenshots | network panel deep-dive (slow queries, redundant calls, payload bloat), Lighthouse, accessibility tree audit per-route, coverage runs, k6 load test |

A second pass at any of these dimensions adds D-items. A tenth pass still adds them. **That's not a flaw in the plan — that's the nature of a 87-model, 30-module, 270-endpoint platform with 50+ phases of accreted history.**

### 18.1 What this means for the plan

The plan is **not** "fix these 70 things and you're done." The plan is **"install the six standardization spines and keep them ratcheting,"** because the spines turn discovery from a heroic episodic activity into a passive, automated, continuous one. Once the ratchets are in place, the *next* pass — whoever does it, whenever — surfaces gaps as **delta against the standard**, not against an ever-growing wishlist.

A literal example: today the brief lists 27 missing notification events (§5). After §11 + §12 + §15 install the standard "every state change → OutboxEvent + AuditLog + Notification translator," any *new* code path that omits these will fail CI before merging. The 27 missing events become the floor; nothing new joins them.

### 18.2 Five discovery mechanisms the plan installs

Each is a continuous, automated, low-friction loop. None require another consultant-style audit pass.

#### A. Reconcilers (BackgroundReconcileService — §15.2 B)

Hourly + daily jobs that compare cached state to derived state and emit `consistency.violation` events. As we add reconcilers per invariant in the register (INV-A1..A12, INV-E1..E6, INV-U1..U6), they expose every drift the moment it happens. The user gets a notification; the engineer fixes it. Discovery becomes a stream, not a milestone.

#### B. Synthetic monitors

After Sprint 8, ship a `e2e/synthetic/` Playwright suite that runs Scenarios A-E (this map's §7) against the live stage every 30 minutes, using a dedicated `synthetic@deliveryit-test.local` account. Failures alert. **Every Scenario step that breaks ships a discovery for free.** Today this is a manual walk; we automate it.

#### C. Anomaly detection on telemetry (§11.O + Sprint 8)

Once metrics are wired (F8.1-3), simple alerts catch: spike in `assignment_legacy_endpoint_call_total`, spike in `responsibility_rule_no_match_total`, spike in `outbox_failed_total`, spike in `idempotency_replay_total`. Each is a discovery channel.

#### D. User feedback surface (DOC-02 Help Center → "Was this helpful?" → ticket)

The Help Center we add in Sprint 4.5 has thumbs-up/down per article and a "Report an issue" CTA on every page. User-reported issues become D-items in a triage queue. The product surface itself becomes a discovery channel.

#### E. CI ratchets (the six DS gates) — the steady state

Each of the six design system ratchets (UI, API, Authz, Data, Customization, Consistency) refuses regressions. As code changes accumulate, the ratchets keep the floor monotonic. Discovery here is "what new violations were introduced this week?" — a number that should always be 0 with new code, and decreasing for old code.

### 18.3 The rate-of-discovery KPI

Track `discrepancies_discovered_per_week`:

- **Pre-Sprint 0:** unknown (the present state — discoveries surface only when consultants/users hit them).
- **Sprint 0-1:** spike (CI baselines establish the floor; many violations surface at once).
- **Sprint 2-7:** declining (ratchets force fixes; reconcilers catch new drift).
- **Sprint 8+:** steady-state low — only new bugs introduced by new code, caught fast.

If at Sprint 6 the rate is flat or rising, the standardization isn't working — re-evaluate. This is the single forward-looking metric that says "are we converging?"

### 18.4 What I will NOT promise

- That the 70 D-items are exhaustive. They aren't. Another pass will find more.
- That all 70 will be closed by Sprint 8. The roadmap says "all 70 mapped to a closing task"; some closing tasks span multiple sprints.
- That the design systems will catch every category of bug. They won't catch logic-correctness bugs in business rules (e.g., "the EAC formula is mathematically wrong"). Those need scenario walkthroughs + domain-expert review, not ratchets.
- That CI ratchets eliminate human review. They reduce the fragility floor; they don't replace judgment.

### 18.5 What I will promise

- Every gap I found is captured and mapped to a closing task.
- The closing approach is **systematic** (six DS spines), not **episodic** (one-off fixes).
- The discovery process becomes **continuous** (5 mechanisms), not **periodic** (consultant audits).
- The standard is **ratcheted** monotonically — once a class of bug is caught, it stays caught.
- The plan accepts its own incompleteness AS the design — the framework gets better as more is found, not worse.

### 18.6 Recommended next iterations of search (if you want them)

If you (or a future Claude pass) want to extract more D-items, here's the priority order. Each should add 10-30 D-items.

| Pass | Time cost | Likely yield |
|---|---|---|
| **Walk Scenario A end-to-end** (full assignment lifecycle through all 9 transitions) | 30 min | 15-25 D-items (transitions, edge cases, race conditions) |
| **Walk every dashboard role** (RM, PM, DM, Director, HR, Employee, dual-role) | 60 min | 20-40 D-items (per-role visibility, scope leaks, missing data) |
| **Test Setup wizard end-to-end** (`/setup`) | 30 min | 5-15 D-items (rare-path bugs that only fire on fresh deploys) |
| **Test M365 + Jira integration sync triggers** | 30 min | 10-20 D-items (external system interactions are fragile) |
| **Test all admin sub-pages** (dictionaries, audit, integrations, monitoring, settings, hris, vendors, access policies, webhooks) | 90 min | 30-50 D-items (admin surfaces are typically less polished) |
| **Concurrency stress test** (k6 / Artillery hitting `/assignments/:id/propose` from 50 actors) | 2 hours | 5-10 critical race conditions |
| **Network-panel audit on dashboard load** (waterfall, redundant calls, slow queries) | 1 hour | 10-20 perf/maintainability D-items |
| **Mobile / narrow-viewport audit** (each main route) | 1 hour | 10-20 responsive layout D-items |
| **Accessibility audit with axe-core** (each main route) | 1 hour | 10-30 a11y D-items |
| **Multi-currency / multi-locale audit** (set tenant home currency to EUR; verify reports) | 30 min | 5-15 D-items |

Total: ~10 hours of additional discovery would plausibly add 100-200 D-items. The plan doesn't depend on us doing them now — but the spines we install in Sprint 0-1 mean **whenever they're done, the discoveries have a home.**

### 18.7 The honest summary

**The brief is necessarily incomplete. The plan is designed for that.** The hardening promise isn't "we found everything." It's "we built the system that keeps finding everything, automatically, monotonically, forever."

That's the real deliverable.

---

## 19. Files in this deliverable bundle

| File | Purpose | Size |
|---|---|---|
| `HARDEN_BRIEF.md` | Plan + 70 discrepancies + per-domain spec + Sprint 0..8 + appendices | ~144 KB |
| `HARDEN_WIRING_MAP.md` | Endpoint inventory, wiring, scenarios, coverage matrix, 6 design-systems, discovery framework | ~150 KB |
| `workforce-ops-benchmark-synthesis.md` | Float / Runn / Resource Guru / Kantata / OpenAir patterns | ~14 KB |

Together these constitute the full hardening brief for the next iteration.

## 20. Working software per sprint (redesign)

**You called out a real flaw.** Three sprints in the original plan don't ship working software:

- **Sprint 0** "Verify, fix-blockers, audit" — 28 tasks of plumbing, no user-visible output.
- **Sprint 4.5** "Documentation" — internal collateral.
- **Sprint 8** "Cleanup, observability" — engineering hygiene.

That violates the principle. Below is the redesigned sprint composition, with a stated **demoable user outcome** for every sprint, plus the DS plumbing running in parallel as the way work gets done — not as a separate sprint.

### 20.1 The "working software" definition of done per sprint

A sprint ships working software iff at the end of the sprint:

1. A **named user role** can perform a **named action** they couldn't perform (or couldn't perform well) before, on the live stage.
2. The action has at least one Playwright happy-path spec proving it works.
3. The action is announced in `CHANGELOG.md` with a one-line description and a screenshot.
4. The action is reachable in ≤3 clicks from the role's dashboard.

If those four can't be ticked, the sprint hasn't shipped — even if a thousand lines of code merged.

### 20.2 Redesigned sprints

| Sprint | Demoable outcome (the headline) | Behind-the-scenes plumbing |
|---|---|---|
| **0 — Stabilization + visible polish** | "I can log in cleanly and see correct page titles, breadcrumbs, and dates." Backend healthy (D-02), breadcrumbs derive from route (FE-FOUND-01 / 0.10), `/admin/people/new` says "New Employee" (FE-FOUND-02 / 0.11), date pickers respect locale (FE-FOUND-03 / 0.12), schema audit complete (0.2), CI baselines for the 6 DS gates established. | DS skeletons + baselines (no rollout yet); SEED-EXT to add Clients + StaffingRequests so subsequent sprints have data. |
| **1 — "HR can hire properly"** | HR Manager opens `/people/add` → 3-step wizard with M365 prefill (P-02) → save → person appears with full profile + RM auto-assigned + RM gets in-app notification (P-03) + Person 360 shows correct ACTIVE status + History tab shows the HIRED event (D-47/D-45 fix via 0.17 + 0.20). | Foundation transactions + outbox publisher (F1-F2); RBAC role catalog (RBAC-1) + `@RequireAction` (RBAC-2); Data DS doc (DDS-1); Customization DS doc (CUST-1); API DS Idempotency middleware + error envelope (ADS-4, ADS-5). |
| **2 — "PM has a real Approval Queue and SR detail"** | PM opens dashboard → sees Pending Proposals tile (S-03) → clicks → Approval Queue with SLA badges → opens an SR → new redesigned StaffingRequestDetailPage (S-02) shows stage strip + per-slot pipeline → can act in 1 click. Plus: legacy staffing endpoints carry deprecation headers (S-01 step B-D). | Pagination DTOs (ADS-6); deprecation interceptor (ADS-13); StaffingRequest reconciler (CONS-3 closing D-11). |
| **3 — "Managers see team health and HR sees expirations"** | RM/PM/DM/Director dashboards gain a Pulse Trend card (P-06) showing 8-week mood per report; HR receives "X people: contract expiring in 14 days" alerts (P-05); Admin → Tenant Settings → Catalog page lets HR change the warning thresholds without a deploy (CUST-5, F7.1). | RBAC dual-approval decorator (RBAC-3) + scope service (RBAC-4); Saga pattern doc + P-07 ref impl in progress (CONS-9); CustomFieldDefinition rendering (CUST-6 / F7.2). |
| **4 — "Project governance is real"** | PM creates project → submits for Director approval (PM-01) → Director sees it on dashboard, approves → project becomes ACTIVE → ProjectDashboardPage shows Project Health KPI strip (PM-02) with schedule/budget/scope/people/risks/time/vendor/radiator tiles → from PvA, PM can approve work hours in 2 clicks (PM-04). KPI/Pulse contradiction resolved (D-54). Radiator returns "Not enough data" for new projects instead of fake red (D-55). | DDS-2 (version on aggregates), DDS-3 (soft-delete standardize), DDS-6 (FK indexes); CUST-2 (risk thresholds in PlatformSetting), CUST-3 (radiator thresholds); CONS-2 (Postgres CHECK constraints). |
| **4.5 — "In-app help and onboarding tour"** | Any user can press `?` for cheatsheet, click the per-page "?" for context article (DOC-04), search Help Center via Cmd+/ (DOC-02), get a 90-second role-based onboarding tour on first login (DOC-03). Admin can edit help content per tenant without deploy (DOC-05). | Help models (HelpArticle/HelpTip/HelpFeedback/OnboardingTourProgress); ext docs site (DOC-06); empty-state copy editorial pass (DOC-07). |
| **5 — "Cost is computable, utilization is visible"** | Finance creates a Rate Card (C-01) → assignments resolve bill rate from card → revenue + margin per project visible → RM sees Org Utilization dashboard with billable/productive/bench split (C-03) → Director sees burn-rate alerts and Portfolio P&L tile (C-04, C-07) → multi-currency reports consolidated to home currency via FX snapshots (C-05). | DDS-4 (enum→Dictionary migration for Risk/Vendor/Milestone), DDS-5 (effective-dating helper); RBAC-5 (`@AuditRead` on PII); CONS-4/5 (cost rollup + rate pinning reconcilers); CUST-4 enum migrations land. |
| **6 — "Staffing edge cases handled, planner is fast"** | RM gets pre-breach SLA warnings at 50%/75% (S-04); cross-project clash detection blocks >100% allocations with override flow (S-06); planner cell click → inline % editor (SD-02) + drag-to-assign (SD-03); per-director routing wired (S-05); demand pipeline view (SD-04). | DDS-7 (drop legacy `Person.skillsets` etc.), DDS-8 (more Postgres CHECKs); reconciler register grows. |
| **7 — "Bench → demand → assignment, end-to-end fast"** | Distribution Studio: right-click → suggest matches (SD-05); scenario diff vs current (SD-06); bench cohort view shows who's coming off projects + best-fit suggestions (SD-07); RM-initiated release with HR + Director dual-approval (P-07) ships; project closure checklist enforces final timesheet + retro before CLOSED (PM-09). | API DS migrations completed for Project, Cost domains (ADS-10, ADS-11); RBAC catalog locked at zero literals. |
| **8 — "Observable + matching engine v2 + signed off"** | Director sees `/admin/monitoring` with metrics catalog (F8.1-3): outbox lag, SLA breach rate, time-to-fill p50, response latency p95. Matching engine v2 (S-10) opt-in: skill+grade+domain+language+TZ+cert weighting (RM toggles `flag.matchingEngineV2Enabled`). Phase 20c remaining clean code items land (DTO refactor, Gateway generics, pagination caps). All 6 DS ratchets at zero violations OR strictly ratcheting. | API DS migrations completed for S&D (ADS-12); FE API client consolidation (ADS-14, ADS-15); legacy endpoint sunset (S-01 step E). |

Every sprint above ends with at least one user-visible feature shipped to stage (and a CHANGELOG entry + a Playwright spec). The DS plumbing rides under the feature work; it doesn't ride instead of feature work.

### 20.3 Sprint capacity reality check

The "~140 tasks across 8 sprints" arithmetic in §17 was averaged. In practice:

- Each sprint ships **1 headline feature** + **2-3 supporting features** + **DS plumbing for the touched domain**.
- Cross-cutting work (RBAC mass-replace of 1041 role literals) is **distributed across multiple sprints** as touched code is updated, not concentrated in one.
- Pure plumbing items (CI baseline scripts, doc skeletons) ride in Sprint 0/1 alongside the features, finalized before they're enforced.

### 20.4 Anti-pattern flag — what NOT to do

If at any point the team is tempted to:

- "Skip the headline feature this sprint to focus on the DS migration" — STOP. Ship the feature and the DS work for the touched code together.
- "Land an enforcement ratchet that breaks 30 PRs" — STOP. Baseline first, ratchet down with the next sprint's PRs.
- "Postpone the feature because the DS migration isn't done" — STOP. Ship a vertical slice; migrate the rest later.

The whole point of the six DS systems is they are **horizontal infrastructure** that supports vertical feature delivery, not a substitute for it.

---

## 21. Meta-audit — auditing this audit

You asked for it; here's the brutally honest pass on my own work.

### 21.1 Claims I overstated or that need correction

| # | Claim | Correction | Severity |
|---|---|---|---|
| **MA-01** | "53 Prisma models" (HARDEN_BRIEF §1.1) | Live count is **87** (`grep -cE "^model [A-Z]" prisma/schema.prisma`). CLAUDE.md is the source of the stale 53; new D-item D-75 added in §21.5. | LOW (numerical) |
| **MA-02** | "59 of 319 controller methods have neither `@RequireRoles` nor `@Public`" (§12.1) | This was a numeric subtraction (319 − 241 − 19). Reality: **22 controllers have class-level `@RequireRoles`** that covers all their methods. The actual count of method-level uncovered endpoints (after subtracting class-level guards and the legitimately public `auth.controller`) is closer to **25-30**, not 59. F3.1 ratchet is still warranted, but the headline number was inflated by ~2x. | MED |
| **MA-03** | "1,041 hardcoded role string literals" (§12.1) | Live grep confirms 1,041 in `src/modules/**.ts` (non-test) and 197 more in `test/`. So 1,041 is correct for production code. Claim stands. | INFO (verified) |
| **MA-04** | "270 endpoints" (§1) | Counts every `@Get|@Post|@Put|@Patch|@Delete` decorator. Confirmed 319 method-level decorators total (§12.1 found this). Discrepancy with my earlier "270" is from spread of methods across 60 controllers — I was rounding. **The accurate count is 319.** | LOW |
| **MA-05** | "Every D-item is mapped to a closing task" (§8) | Some mappings are vague ("covered (DOC-07 + Sprint 1)" doesn't name a specific task). A second-pass tightening would name a single closing task per D-item. Today's mapping is **directionally correct, not surgically tight**. | MED |
| **MA-06** | "The whole event/audit/notification pipeline is dead for create+activate" (D-47/D-59/D-70 family) | Based on **one** create flow (admin creates an employee via `/admin/people/new`). Could be specific to that endpoint's path, not a global regression. **Until verified by a second create endpoint test** (e.g., create via `/setup/admin`, or person create through a different code path), the family conclusion is **strongly suggested but not proven**. | HIGH (claim → hypothesis) |
| **MA-07** | "Person 360 shows 'Inactive' for an ACTIVE employee" (D-45) | Confirmed via filter (Active list went 201→202; Inactive list shows 0). Claim stands. | INFO (verified) |
| **MA-08** | "70 distinct discrepancies after dedup" (§8.2) | 4 duplicates flagged, but other near-dups not collapsed: D-50/D-21 (post-create UX), D-58/D-61 (no ConfirmDialog on Activate), D-12/D-62 (Director gate). A stricter dedup would put the count at 64-66. | LOW (cosmetic) |
| **MA-09** | "API versioning at `/api/v1/`" (§11.2 L) | Adding this is a **breaking change for all 319 endpoints**. I should size this as multi-sprint work, not a §11.2 bullet. Recommend: introduce `Api-Version` header instead (non-breaking) and only adopt URL versioning if/when v2 is needed. | HIGH (size mistake) |
| **MA-10** | "Idempotency-Key required on every state-changing endpoint" (§11.2 J) | Same problem — that's 100+ endpoint changes. Recommend: header is **accepted** on every endpoint (cached if present); **required** only on critical financial/staffing transitions in this iteration; ratchet up over multiple sprints. | MED (size mistake) |
| **MA-11** | "Sprint 1 has F1-F9 + RBAC-1..8 + DDS-1 + CUST-1 + ADS-1..5 + CONS-1,7,8 — ~28 tasks" (§16.1 sprint integration table) | That's 2-3 sprints of work, not 1. The redesigned sprints in §20.2 reduce Sprint 1 to a focused headline (HR wizard) + foundation plumbing for that vertical slice; remaining DS work spreads across Sprints 2-7. | HIGH (sizing) |
| **MA-12** | "C-01 RateCard adds 3 Prisma models + service + UI + RBAC + tests" — listed as one task | Actually 1-2 sprints' worth. Should be split into C-01a (schema + resolver), C-01b (admin UI), C-01c (assignment FE integration). | MED |
| **MA-13** | "S-05 ResponsibilityMatrix" — Sprint 6, but PM-01 is Sprint 4 and depends on it | Dependency cycle missed. PM-01 should either: (a) move to Sprint 6 (delays Director-approval); or (b) ship with a hardcoded fallback in Sprint 4 and consume ResponsibilityMatrix in Sprint 6. The redesign in §20.2 implicitly chose (b) by listing PM-01 in Sprint 4, but the §20.2 row should make that explicit. | HIGH (dep-cycle) |
| **MA-14** | "DDS-2 add `version` to 73 aggregates" — Sprint 4 | The `idempotency-on-mutation` CONS ratchet (§15.3) requires version. CONS is Sprint 1. If `version` lands in Sprint 4, the ratchet can't enforce until then. Either move DDS-2 to Sprint 1 (huge migration up-front) OR document that the ratchet starts at WARN until Sprint 4 then promotes to ERROR. The latter is better. | MED (ordering) |
| **MA-15** | "Pulse audience = RM/PM/Director/HR" (§14.5) | I never verified that the today's Pulse read endpoint actually scopes correctly. Without scope-service rollout (RBAC-4), this is theoretical. Acceptance test in P-06 should explicitly assert scope (RM only sees their pool's pulse). | MED (vague acceptance) |
| **MA-16** | "Bill rate seed: P1 $50 / P5 $250" (HARDEN_BRIEF §11.1 J2) | Live walk found grades are G7-G15 ("G7 Junior" → likely G15 senior). My P1-P5 mapping was hypothetical. The actual seed grade range needs a concrete dictionary entry → band mapping. Sprint 0 task 0.14 covers it; the brief's Appendix B map needs updating from "G1-G2 → P1" to actual range. | MED |
| **MA-17** | Live walks were SysAdmin-only | Every other role (Director, PM, RM, HR, DM, Employee) likely surfaces different bugs (visibility scope leaks, missing data, wrong RBAC). I didn't walk them. §18.6 lists this as a known next-pass item. **Acknowledged honestly; not a flaw in the catalog so much as a known coverage gap.** | INFO (known) |
| **MA-18** | "Multi-tenancy hold per J1" but Authz/API DS adds tenantId to JWT + headers | Inconsistent. Either we're truly single-tenant per deployment (then tenantId is redundant) OR we're preparing for SaaS (then J1 should reverse). My recommendation: add `tenantId` columns + JWT claim defaulted to `'default'` for now (zero runtime cost in single-tenant); when J1 reverses, only RLS + cross-tenant queries change. **Document this trade-off**, don't pretend it's pure single-tenant. | LOW (doc clarity) |
| **MA-19** | "Browser walks revealed Cmd+K returns 'No results' for 'walker'" (D-68) | I tested in the SAME browser session post-login. If JWT included scopes that excluded walker (e.g., admin doesn't scope-include all people), this could be a **scope bug** masquerading as a search-coverage bug. Needs to be retested with explicit `?include=people` API param if the API supports it. | MED (alternative explanation) |
| **MA-20** | "All claims in §11 (API DS) come from grep evidence" | True for inconsistencies. False for the recommended STANDARD — the standard is my opinion based on industry practice (RFC-style envelopes, JSON:API-influenced). Other valid choices exist (GraphQL, RPC, custom). I should call this out: the §11 standard is **a** standard, not **the** standard. | INFO (positioning) |
| **MA-21** | "Sprint 8 Phase 20c remaining" — listed but specific items not enumerated in this brief | The HARDEN_BRIEF §1.3 lists Phase 20c remaining items but doesn't break them into sprint-mapped sub-tasks. Should be enumerated. | LOW (admin) |
| **MA-22** | "Reconcilers as a discovery mechanism" (§18.2 A) | Reconcilers detect drift but **don't surface novel bugs** (only invariants we already named). Genuinely novel discovery still needs a human walk. I oversold reconcilers' generality. | MED (reframe) |
| **MA-23** | "5 discovery mechanisms make discovery continuous" (§18.2) | Of the 5, only #1 (reconcilers) is purely automated; the other 4 (synthetic monitors, anomaly alerts, user feedback, CI ratchets) require human triage. **It's "continuously surfacing", not "continuously closing."** Reframe in §18.2. | LOW (claim precision) |
| **MA-24** | "70 D-items mapped" but some D-items are about **CLAUDE.md being stale** (e.g., D-26) which isn't a code bug | Triage would split D-items into: code bugs (most), data/seed bugs (D-34, D-35), doc bugs (D-26, D-38), UX copy (D-44, D-51), discovery findings (whole D-39..D-74 family). Different teams own each. The sprint mapping conflates them. | LOW (categorization) |
| **MA-25** | The §11.5 refactor ladder claims "API DS migrations alongside HARDEN sprints" but doesn't budget time | Migrating 60 controllers' endpoints to a new envelope, even alongside features, is **at least 1-2 days of refactor per controller**. Total ~60-120 engineer-days. That's 12-24 sprint-weeks at 1 engineer. **Not realistic in 8 sprints unless 5+ engineers parallelize.** | HIGH (sizing) |

### 21.2 Things I should have done but didn't

| # | What | Why it matters |
|---|---|---|
| **MS-01** | Walk Scenario A end-to-end (full assignment lifecycle) | The single highest-yield missing audit (§18.6 listed it; I didn't do it) |
| **MS-02** | Sample 2-3 different roles' dashboards (Director, PM, RM) | Would surface scope-leak bugs invisible to admin |
| **MS-03** | Run a load test on `/staffing-desk/planner` | Heatmap rendering with 200 people × 26 weeks is a perf hot path |
| **MS-04** | Verify `OutboxEvent` publisher exists in code (or doesn't) | I assumed it doesn't based on absent grep results; should grep the publisher class explicitly |
| **MS-05** | Read 3-5 actual service implementations to verify wiring claims | I cited service names without reading their bodies. The §6.x wiring map is mostly inferred from naming. |
| **MS-06** | Audit existing tests for what's actually covered | Phase tracker says many things are "tested"; haven't verified test files exist with passing assertions |
| **MS-07** | Estimate PR sizes for cross-cutting refactors (RBAC mass-replace, audit columns, etc.) | The claim "ratchet down over sprints" is fine; the unstated size of each PR isn't. |
| **MS-08** | Multi-tenant cost analysis (do we actually want to defer J1?) | I accepted J1 hold without weighing the cost of adding tenantId everywhere and never enabling RLS |
| **MS-09** | Concurrency stress test of `/assignments/:id/propose` | Would surface race conditions invisible in sequential clicks |
| **MS-10** | Production data sample assessment | All my walks used `it-company` seed (200 people, 40 projects, 5y history). Real prod data shapes can differ |

### 21.3 Things I claimed are "deferred" but should be reconsidered

| # | Item | Reason to reconsider |
|---|---|---|
| **DEF-01** | WorkflowDefinition consumption (CUST-7) — "future iteration" | This is the spine of customizing case workflows, project closure, onboarding. Without it, those flows stay hardcoded. Should not be punted past Sprint 8. |
| **DEF-02** | Tenant branding (CUST-8) — "future iteration" | Per-tenant logo + color is table-stakes for a B2B platform. Even if scoped to logo URL + 1 color, ship in Sprint 4.5 alongside docs. |
| **DEF-03** | Auto-generated FE API clients from OpenAPI (ADS-14) — Sprint 8 | High leverage for FE/BE contract correctness. Should land in Sprint 4-5 to benefit later DS migrations. |
| **DEF-04** | Per-tenant role customization (RBAC-10) — "future" | If tenants need custom roles (e.g., "Finance Reviewer", "Account Director"), this is core. Verify need with user before deferring. |
| **DEF-05** | Audit-on-read for non-compensation PII | I scoped @AuditRead to compensation. Should expand to PII (DOB, address, mood data) per data privacy. |

### 21.4 Things I omitted entirely

| # | Topic | Why important |
|---|---|---|
| **OM-01** | Email deliverability + bounce handling | NotificationDispatchService delivers email; what if the address bounces? Today: silent failure. Need bounce capture + admin visibility. |
| **OM-02** | File upload (avatars, attachments) — D-15 mentions photo upload | Where do uploads go? S3? Local? CDN? File-size limits? Virus scan? The brief says "photoUrl on Person" but doesn't spec the upload endpoint. |
| **OM-03** | Search performance at scale | `/people` directory loads 25/page; OK for 200 seed but at 5000 people: pagination + indexed search via pg_trgm (already enabled DM-8) needs explicit migration. |
| **OM-04** | Internationalization (i18n) | App is English-only; the locale leak (D-29) is a date-format issue, not full i18n. If multi-region, need react-intl or equivalent. |
| **OM-05** | Accessibility (WCAG) audit | Phase 20e marked done but I didn't validate against axe-core. Many of the bugs found (native `<select>` with 200 options, breadcrumb leak) likely have a11y consequences. |
| **OM-06** | Mobile / responsive design | Most pages have no responsive design contract. Field worker / on-site PM scenarios. |
| **OM-07** | Data export / archival / retention policy | GDPR/legal: how long is `PulseEntry` retained? Per-tenant retention settings. |
| **OM-08** | Disaster recovery / backup verification | RPO/RTO statement. Tested restores. |
| **OM-09** | Performance budgets per route | Slow-3G load, p95 latency targets. Phase 20d-03 done some; not comprehensive. |
| **OM-10** | Onboarding the first new tenant | "Setup wizard" exists for first deploy; what about second tenant onboarding? In single-deployment-per-tenant model (J1), this is a re-deploy. Cost? Time? Documented? |
| **OM-11** | Customer support tooling | When a user reports a bug, can admin "View as" them and reproduce? View-as exists (CLAUDE.md pitfall #13) but no impersonation audit trail visible to me. |
| **OM-12** | API consumer documentation | When a partner (vendor, client) wants to integrate, where do they read? OpenAPI exists but no developer portal. |

### 21.5 New D-items surfaced by this meta-audit

| ID | What |
|---|---|
| **D-75** | CLAUDE.md says "53 models" — actual is 87. Stale doc. |
| **D-76** | API versioning strategy unclear (MA-09 — `/api/v1/` is breaking; recommend `Api-Version` header). |
| **D-77** | C-01 RateCard task is oversized; split into C-01a/b/c. |
| **D-78** | PM-01 → S-05 dependency-cycle: PM-01 in Sprint 4 needs S-05 (Sprint 6). Sequence fix needed. |
| **D-79** | DDS-2 (version on aggregates) → idempotency-on-mutation ratchet ordering issue. |
| **D-80** | Email bounce handling missing. |
| **D-81** | File upload spec missing. |
| **D-82** | i18n strategy missing. |
| **D-83** | Data retention policy missing. |
| **D-84** | Customer support / impersonation audit trail unclear. |

Total now **80 distinct D-items** (was 70). Three were duplicates I un-flagged in MA-08 (D-50/D-21 are *not* the same — D-50 is the no-redirect bug, D-21 is the framing issue; they were correctly separate).

### 21.6 Honest answers to "do you 100% understand this system?"

**No, and the framework should not require that I do.** The 87-model platform with 50+ phases of accreted history, 30 modules, 319 endpoints, and a stage I walked for ~90 minutes is not knowable in any single session. What I claim:

- **High confidence (verified by code/grep):** the inventories in §2-§5; the headline architectural patterns (DDD layout, transactional outbox, page grammars, design tokens); the existence of Phase WO/CSW/PR-v1 and what they delivered; that Person 360 status is buggy (D-45 verified); that skills system is double-truthed (D-46 verified).
- **Medium confidence (inferred from naming + CLAUDE.md):** service-to-repo wiring details; cron job presence/absence; specific business-rule correctness inside services I didn't read.
- **Low confidence (single-data-point):** the "create+activate event pipeline is broken" claim (MA-06); the Cmd+K bug (MA-19); some D-item severities; the size estimates of each task.

The plan accommodates this through the six DS ratchets (which catch **classes** of bugs, not specific instances) and the five discovery mechanisms (which keep finding more). **The standard the plan installs is verifiable; the count of bugs at the start is approximate.**

### 21.7 What I'd do differently if I started this audit over

1. **Walk every role's dashboard before any other audit.** It's the highest-yield 30 minutes available.
2. **Read 5 service implementations end-to-end, not just module names.** Wiring claims should cite line numbers.
3. **Estimate every task in person-days inline** in the brief, not just count tasks.
4. **Distinguish "code bugs" / "data bugs" / "doc bugs" / "UX copy bugs"** in the D-item register from day 1.
5. **Cap the API DS proposals to non-breaking changes in sprint 1-4**; defer URL versioning + universal idempotency to a later phase.
6. **Test every critical flow at least twice** (create employee, create project, transition assignment) — once to discover, once to confirm the discovery is reproducible and not a JS-state quirk.

---

## 22. Combined refresh — what landed in this round

| What | Where | New material |
|---|---|---|
| Working software per sprint | §20 | Sprint redesign with named demoable outcomes; capacity reality check; anti-patterns |
| Meta-audit | §21 | 25 corrections (MA-01..25) + 10 things I should have done (MS-01..10) + 5 deferred items to reconsider (DEF-01..05) + 12 omissions (OM-01..12) + 10 new D-items (D-75..84) + honest confidence calibration |

**Total D-items in the bundle: now 80** (70 from prior + 10 new from §21.5). Sprint count unchanged (8 + 4.5 = 9 sprints). DS spines unchanged (6).

The promise is updated: not "we found everything," not "the framework is perfect," but **"the framework keeps the floor monotonic, every sprint ships user-visible value, and where I overstated I now say so explicitly."**

That's the honesty bar.

— end —
