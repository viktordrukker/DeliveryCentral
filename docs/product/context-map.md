# Context Map

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
Integrations Hub ------------------> Project Registry ------------------------------------+
Integrations Hub ------------------> Time & Work Evidence
Integrations Hub ------------------> Identity & Access / Organization sync adapters
Time & Work Evidence -------------> Audit & Observability
Assignment & Workload ------------> Audit & Observability
All contexts ---------------------> Audit & Observability
Customization / Metadata ---------> all operational contexts as configuration only
```

## Relationship rules

- `Project Registry` owns internal `Project` and `ProjectExternalLink`.
- `Assignment & Workload` owns authoritative `ProjectAssignment`, approval flow, and workload calculations.
- `Time & Work Evidence` owns observed work facts and variance detection inputs.
- `Integrations Hub` translates external systems through adapters and anti-corruption mapping. It does not own staffing truth.
- `Organization & Org Chart` owns people, org units, reporting lines, and effective-dated manager scope.
- `Customization / Metadata` supplies field definitions and validation rules to contexts but does not own operational records.

## Scenario anchors

### Jira activity without formal assignment

- Jira activity enters through `Integrations Hub`.
- `Time & Work Evidence` may store work evidence for audit or analytics.
- `Assignment & Workload` remains unchanged unless a separate internal workflow approves an assignment.

### Formal assignment without Jira activity

- `Assignment & Workload` remains valid because planned work is authoritative even when no external work evidence exists yet.
- `Time & Work Evidence` may later report missing evidence, but it cannot invalidate assignment truth.

### Manager scope changes over time

- `Organization & Org Chart` owns effective-dated reporting lines and manager scopes.
- Downstream contexts consume snapshots or events, never redefine the org model.

### Multiple external project links

- A single internal `Project` may carry many `ProjectExternalLink` records.
- This allows Jira, future ALM tools, and finance-facing references to coexist without changing the project identity.

### Matrix visibility versus approval authority

- `Organization & Org Chart` models solid-line and dotted-line relationships.
- `Assignment & Workload` interprets those relationships through policy to decide who may review versus approve.

### On-prem and cloud adapters

- `Integrations Hub` may host multiple adapters for the same provider family.
- Adapter differences must terminate at the anti-corruption layer and never leak into core domain models.

### Custom fields by entity and organization

- `Customization / Metadata` owns field definitions, enablement, and validation rules.
- Operational contexts consume metadata contracts rather than inventing local schema drift.
