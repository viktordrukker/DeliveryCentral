# Ownership Matrix

| Context | Owns | Publishes | Consumes | Must Never Own |
|---|---|---|---|---|
| Identity & Access | identity accounts, roles, permissions, access policies | account provisioned, account suspended, policy changed | person created, employment status changed, case approved | org hierarchy, projects, assignments, work evidence |
| Organization & Org Chart | people, org units, reporting lines, manager scope history | person changed, org unit changed, reporting line changed, manager scope changed | external HR sync outputs, account linkage events | assignments, projects, case workflow, notification delivery |
| Project Registry | project, project external link, project status | project created, project updated, project archived, external link changed | external project discovered, metadata schema updates | assignments, work evidence, staffing approvals |
| Assignment & Workload | project assignment, assignment approval flow, capacity rules, workload views | assignment requested, assignment approved, assignment revoked, workload threshold exceeded | person/org changes, project lifecycle events, policy changes | Jira issue assignee state, work evidence truth, external link ownership |
| Time & Work Evidence | work evidence, time entries, import batches, evidence source links | work evidence recorded, evidence import completed, assignment-evidence variance detected | external evidence imports, person/project references, assignment lifecycle events for analytics only | assignment mutation, project catalog truth, org ownership |
| Onboarding / Offboarding / Case Management | lifecycle cases, case tasks, case decisions, transition checklists | case opened, case approved, offboarding impact detected | person employment changes, assignment changes, account state changes | assignment truth, org structure truth, integration adapter logic |
| Integrations Hub | provider adapters, sync jobs, external envelopes, connection config | external project discovered, external work evidence imported, external sync failed | sync commands, metadata mapping config, case-triggered provisioning commands | canonical project identity, assignments, org chart truth |
| Notifications | notification requests, templates, delivery records, preferences | notification queued, delivered, failed | business events from all contexts | approval decisions, assignments, org chart semantics |
| Audit & Observability | audit records, event logs, telemetry, compliance views | compliance alert raised, integration health degraded | all domain/integration events | business state authority in any operational domain |
| Customization / Metadata | custom field definitions, validation rules, schema versions, policy config | metadata schema published, custom field enabled, validation rule changed | admin commands only | operational records, integration adapters, project or assignment instances |

## Ownership distinctions

- `Project` and `ProjectExternalLink` are not the same thing. Registry owns both, but they remain separate entities.
- `Assignment` and `WorkEvidence` are distinct truth models owned by different contexts.
- `Person` belongs to Organization; `IdentityAccount` belongs to Identity & Access.
- `OrgUnit` hierarchy and `ReportingLine` graph are separate organizational constructs.
- `Case` workflow and assignment approval workflow are separate process models.
- Metadata schema is configuration, not business operational data.
- Notification request and delivery record are separate concerns within Notifications.
