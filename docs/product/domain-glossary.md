# Domain Glossary

## Project

Canonical internal representation of a staffed initiative or delivery effort inside the platform. A project is owned by Project Registry and may exist before any external link is attached.

## Project External Link

Reference from an internal `Project` to an external system identifier and URL, such as Jira today or another tool later. It is not the project identity and must remain separate so one project can carry multiple external links over time.

## Assignment

Formal internal allocation of a person to a project with approval state, timing, and workload semantics. It is authoritative only inside the platform and must never be created or mutated from Jira issue data.

## Workload

Calculated view of planned commitments against a person, team, manager scope, or org unit for a given period. Workload is derived from assignment and capacity rules, not from issue ownership in external systems.

## Capacity

Available allocatable effort for a person or group over a period after applying employment status, schedules, leave assumptions, and policy constraints.

## Work Evidence

Observed data indicating work happened, such as time entries or imported Jira activity. Work evidence is used for audit, analytics, and variance detection, and can exist with or without a matching approved assignment.

## Person

Human business subject represented in organizational and workload processes.

## IdentityAccount

Security and authentication principal used for platform access. A person and an identity account are related concepts, not the same entity.

## Line Manager

Primary reporting manager in the organizational structure. Line management expresses formal reporting responsibility but does not automatically imply staffing approval authority in every policy model.

## Resource Manager

Actor with policy-granted authority over staffing, workload, and capacity decisions. This may differ from the line manager and may vary over time by organization policy.

## Dotted-line Manager

Secondary or matrix manager with visibility and possibly review rights, but not necessarily assignment approval rights. Dotted-line visibility must be modeled separately from formal approval authority.

## Org Unit

Hierarchical organizational node used for structural ownership, visibility, budgeting, or policy scope. The org unit hierarchy is distinct from reporting lines between people.

## Approval State

Lifecycle state describing a decision process outcome, such as requested, approved, rejected, or revoked. Approval state is contextual and should not be reused blindly across assignments, cases, or integrations.

## Case

Managed lifecycle process for onboarding, offboarding, access transition, or other operational workflows that intersect with assignments and org structure. Case workflow is separate from assignment workflow.

## ReportingLine

Effective-dated relationship that defines who oversees whom and under which relationship type, such as solid-line or dotted-line.
