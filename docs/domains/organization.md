# Organization Domain

## Purpose

The Organization bounded context owns operational org-chart truth used by:

- visibility scope
- assignment approval routing
- manager dashboards
- historical audit and reconstruction

It is not a presentation helper. It is the source of truth for effective-dated reporting structures and organizational hierarchy.

## Implemented domain model

### Entities

- `Person`
- `OrgUnit`
- `Position`
- `ReportingLine`
- `PersonOrgMembership`
- `ResourcePool`

### Value objects

- `PersonId`
- `OrgUnitId`
- `ReportingLineType`
- `EffectiveDateRange`

### Repository ports

- `PersonRepositoryPort`
- `OrgUnitRepositoryPort`
- `ReportingLineRepositoryPort`
- `PersonOrgMembershipRepositoryPort`

### Domain services

- `GetCurrentManagerService`
- `GetReportingChainAtDateService`
- `GetOrgSubtreeService`
- `GetManagerScopeService`

## Effective dating rules

- reporting lines are never overwritten in place for future reorganizations
- future manager changes are represented by a new `ReportingLine` with a later effective range
- solid-line and dotted-line relationships can coexist for the same person
- historical reporting truth is reconstructed by querying the relationship set at a specific date

## Scenario coverage

### Employee changes line manager next month

Create a future-dated `ReportingLine`. Current manager queries continue to resolve the current line until the effective start date passes.

### Employee has one solid-line manager and optional dotted-line managers

`ReportingLineType` separates relationship semantics. Current-manager resolution only considers solid-line relationships by default, while manager-scope queries can explicitly include dotted-line relationships.

### Project manager may not be in reporting chain

The Organization context does not assume project management relationships are equivalent to reporting relationships. A project manager can be modeled elsewhere without corrupting org truth.

### Historical reporting chain must be reconstructable

`GetReportingChainAtDateService` walks solid-line relationships at a specified date, allowing audit reconstruction after reorganizations.

### Org subtree must be queryable

`GetOrgSubtreeService` resolves a root org unit and its descendants from the hierarchy.

### Manager scope must later support approval use cases

`GetManagerScopeService` provides the direct-report layer for a manager at a given date and can be extended with policy-aware approval semantics in the Assignment context.

## Persistence path

- Prisma schema contains the durable runtime tables for:
  - `Person`
  - `OrgUnit`
  - `Position`
  - `PersonOrgMembership`
  - `ReportingLine`
  - `ResourcePool`
  - `PersonResourcePoolMembership`
- `OrganizationPrismaMapper` maps persistence records into domain entities.
- The live `OrganizationModule` now resolves runtime persistence through Prisma-backed adapters for:
  - `Person`
  - `OrgUnit`
  - `PersonOrgMembership`
  - `ReportingLine`
  - team/resource-pool storage
- `PrismaPersonDirectoryQueryRepository` backs person directory and manager-scope reads from persisted organization data.
- `OrgChartQueryService` reconstructs hierarchy and dotted-line visibility from durable repositories while preserving effective-dated semantics.
- Team APIs stay separate from org units but now read and write durable `ResourcePool` and `PersonResourcePoolMembership` rows.
- In-memory repositories still exist for focused domain and unit tests, but they are no longer the live application runtime for the Organization context.
- Nest wiring can continue to use `OrganizationOrgChartModule`, which still aliases the concrete `OrganizationModule`.

## Runtime note

- Organization writes now survive application restart.
- Docker seed data populates the same Prisma-backed organization runtime used by the application.
- Other bounded contexts still have their own persistence convergence work; Organization is now the durable source of truth for employee lifecycle, reporting lines, org memberships, and teams.
