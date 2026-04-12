# 000 System Overview

## Purpose

The Workload Tracking Platform is the internal system of record for project staffing, assignment approvals, workload planning, organizational visibility, and onboarding/offboarding impact on staffed work.

## Authoritative boundaries

### Why `ProjectAssignment` is internal truth

Formal staffing decisions carry approval policy, manager scope, organizational accountability, and historical audit requirements. Those concerns exist only inside the platform. External delivery tools do not know who was approved, who had the right to approve, or how assignment capacity interacts with org policy. For that reason, `ProjectAssignment` is an internal aggregate and cannot be authored by Jira or any other external tool.

### Why Jira is only project registry plus work evidence

Jira may provide:

- project identifiers and metadata that help populate the internal project registry
- issue and activity records that serve as optional work evidence for audit or analytics

Jira may not provide:

- authoritative staffing assignments
- assignment approval state
- resource manager decisions
- workload capacity truth

This separation prevents accidental coupling between issue-level work execution and enterprise staffing governance.

### Why `WorkEvidence` is separated from `ProjectAssignment`

Planned staffing and observed work are different business facts:

- `ProjectAssignment` answers who is approved to work on which project and under what timeframe or capacity expectation.
- `WorkEvidence` answers what work or time was observed, regardless of whether it matched the approved plan.

This is required for the platform to support both of these scenarios without corrupting state:

- a person is formally assigned before Jira work begins
- a person performs Jira work before approval exists and the platform must flag variance instead of auto-creating an assignment

## Architecture style

- Modular monolith with bounded contexts
- DDD aggregates and value objects
- Hexagonal architecture with ports and adapters
- Anti-corruption layer for integrations
- Outbox-ready persistence foundation
- Configuration-driven behavior

## Bounded contexts

1. Identity & Access
2. Organization & Org Chart
3. Project Registry
4. Assignment & Workload
5. Time & Work Evidence
6. Onboarding / Offboarding / Case Management
7. Integrations Hub
8. Notifications
9. Audit & Observability
10. Customization / Metadata

## Initial technical foundation

- NestJS application bootstrap with structured logging and correlation IDs
- Prisma schema for technical cross-cutting records:
  - `AuditLog`
  - `OutboxEvent`
  - `IntegrationSyncState`
  - `CustomFieldDefinition`
  - `CustomFieldValue`
- Health and readiness endpoints
- Testing scaffold for application bootstrap and shared domain primitives

## Integration stance

External systems are treated as sources of external records, never as direct writers into core aggregates. Each provider must be accessed through an adapter in the Integrations Hub. The adapter emits normalized data that downstream bounded contexts may accept or reject according to their own invariants.
