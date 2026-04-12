# Context Events

## Event catalog by context

| Context | Publishes | Consumes |
|---|---|---|
| Identity & Access | `IdentityAccountProvisioned`, `IdentityAccountSuspended`, `AccessPolicyChanged` | `PersonCreated`, `PersonEmploymentStatusChanged`, `CaseApproved` |
| Organization & Org Chart | `PersonCreated`, `PersonUpdated`, `OrgUnitChanged`, `ReportingLineChanged`, `ManagerScopeChanged` | external HR sync outputs, identity linkage events |
| Project Registry | `ProjectCreated`, `ProjectUpdated`, `ProjectArchived`, `ProjectExternalLinkAdded`, `ProjectExternalLinkChanged` | `ExternalProjectDiscovered`, `MetadataSchemaPublished` |
| Assignment & Workload | `AssignmentRequested`, `AssignmentApproved`, `AssignmentRejected`, `AssignmentRevoked`, `CapacityChanged`, `WorkloadThresholdExceeded` | `PersonEmploymentStatusChanged`, `ReportingLineChanged`, `ManagerScopeChanged`, `ProjectArchived`, `PolicyChanged` |
| Time & Work Evidence | `WorkEvidenceRecorded`, `EvidenceImportCompleted`, `AssignmentEvidenceVarianceDetected` | `ExternalWorkEvidenceImported`, `ProjectCreated`, `ProjectExternalLinkAdded`, `AssignmentApproved` |
| Onboarding / Offboarding / Case Management | `CaseOpened`, `CaseApproved`, `CaseRejected`, `OffboardingImpactDetected` | `PersonEmploymentStatusChanged`, `AssignmentApproved`, `AssignmentRevoked`, `IdentityAccountSuspended` |
| Integrations Hub | `ExternalProjectDiscovered`, `ExternalWorkEvidenceImported`, `ExternalSyncFailed`, `ExternalSyncCompleted` | sync commands, metadata mapping config, provisioning requests |
| Notifications | `NotificationQueued`, `NotificationDelivered`, `NotificationFailed` | approval, case, project, and workload events that need communication |
| Audit & Observability | `ComplianceAlertRaised`, `IntegrationHealthDegraded` | all domain and integration events |
| Customization / Metadata | `MetadataSchemaPublished`, `CustomFieldEnabled`, `ValidationRuleChanged`, `PolicyChanged` | admin commands |

## Scenario-focused flows

### Jira activity exists without formal assignment

1. `Integrations Hub` publishes `ExternalWorkEvidenceImported`.
2. `Time & Work Evidence` stores evidence and publishes `WorkEvidenceRecorded`.
3. If no approved assignment exists in the reference model, `Time & Work Evidence` publishes `AssignmentEvidenceVarianceDetected`.
4. `Assignment & Workload` may surface review work, but it does not auto-create a staffing assignment.

### Formal assignment exists without Jira activity

1. `Assignment & Workload` publishes `AssignmentApproved`.
2. No Jira event is required for assignment validity.
3. `Time & Work Evidence` may later evaluate evidence gaps for analytics only.

### Manager scope changes over time

1. `Organization & Org Chart` publishes `ManagerScopeChanged`.
2. `Assignment & Workload` and `Case Management` consume the change for routing and visibility.
3. Audit records preserve historical decision provenance.

### Multiple external project links

1. `Integrations Hub` publishes `ExternalProjectDiscovered` from one or more providers.
2. `Project Registry` resolves or creates a single internal `Project`.
3. `Project Registry` publishes `ProjectExternalLinkAdded` for each provider-specific link.

### Matrix visibility differs from approval authority

1. `Organization & Org Chart` publishes `ReportingLineChanged`.
2. `Assignment & Workload` evaluates policy to distinguish review rights from approval rights.
3. Notifications target appropriate visibility audiences without altering approval rules.

### On-prem and cloud adapters coexist

1. `Integrations Hub` runs provider-specific adapters under separate connection configurations.
2. Both publish normalized integration events.
3. Core contexts consume normalized events without provider-specific branching.

### Custom fields vary by entity and organization

1. `Customization / Metadata` publishes `MetadataSchemaPublished` and `ValidationRuleChanged`.
2. Owning contexts apply the new schema to their own entities.
3. No context transfers operational ownership to Metadata.
