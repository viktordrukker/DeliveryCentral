# Persona JTBDs

This document captures Jobs To Be Done for the main operational personas implied by the implemented platform.

The goal is to help planning agents prioritize features by user outcome, not just by endpoint availability.

## Regular Employee

### Core JTBDs

- When I am staffed to a project, I want to see my current and future assignments in one place so I understand what I am expected to work on and when.
- When I record work, I want my recent evidence and effort summary to be visible without changing staffing truth so I can confirm the platform reflects what I actually did.
- When my manager, org placement, or staffing situation changes, I want my dashboard and profile context to stay clear and current so I know who I report to and where to go for help.
- When I finish assigned work, I want assignment state changes to be explicit and understandable so I am not left guessing whether I am still planned against a project.
- When workflow or notification events affect me, I want the platform to remain predictable and readable so I can trust it as an operational source of context even if it is not yet a full employee inbox.

### Planning implications

- employee self-service clarity now matters more than adding another generic summary page
- the next employee-facing gains are self-scope hardening, clearer session/auth behavior, and tighter linkage between assignments, work evidence, and profile context

## Project Manager

### Core JTBDs

- When I own multiple active projects, I want to see staffing gaps, recent assignment changes, and delivery anomalies in one place so I can intervene before project risk grows.
- When a project is ready to start, I want to activate it and bring staffing online through clear project lifecycle actions so delivery can begin with explicit operational truth.
- When a project is nearing completion, I want to close it with a workspend summary based on actual evidence so I can capture delivery history without rewriting staffing history.
- When I need a whole team on a project, I want to assign the team in one operation while preserving person-level traceability so I can move quickly without losing accountability.
- When assignments are requested for my projects, I want to review and approve or reject them with full context so project staffing stays governed and auditable.

### Planning implications

- the next PM gain is tighter actionability from existing lifecycle and anomaly views
- project-to-assignment and project-to-exception handoff is now more valuable than adding another PM-only summary surface

## Resource Manager

### Core JTBDs

- When I manage capacity across teams, I want to see idle people, underallocation, overallocation, and future pipeline so I can rebalance staff before conflicts become escalations.
- When project demand is coming in, I want to create assignments in bulk or by team so I can respond operationally without repetitive data entry.
- When organization reporting relationships change, I want to update line-management structure with effective dates so capacity oversight reflects the real org without destroying history.
- When an employee becomes inactive, I want the system to stop new assignments automatically so resource planning reflects current workforce reality.
- When a team is overloaded or spread too thin, I want a team-level operational dashboard so I can act at team scope rather than person-by-person only.

### Planning implications

- the next RM gain is better exception handoff from capacity and team views
- reassignment efficiency and conflict visibility now matter more than basic team/dashboard existence

## HR Personnel

### Core JTBDs

- When workforce shape changes, I want to see headcount, active versus inactive employees, org distribution, grade distribution, and role distribution so I can understand organization health quickly.
- When employees join, change managers, move org units, or deactivate, I want those lifecycle changes to be explicit and historically reconstructable so people governance remains trustworthy.
- When invalid or incomplete organization data exists, I want to find employees without managers or org units so I can correct structural issues before they affect downstream workflows.
- When I create or deactivate employees, I want those actions to be auditable and reflected consistently across staffing and dashboards so workforce operations stay coherent.
- When dictionaries like grade, role, and skillset evolve, I want controlled admin management of those values so people data stays configurable without code changes.

### Planning implications

- the core HR operational surface now exists
- the next HR gain is stronger governance traceability, self-scope correctness, and audit-connected investigation paths

## System Administrator

### Core JTBDs

- When the platform is running in dev or staging, I want to see health, readiness, diagnostics, monitoring summaries, and integration status so I can detect and triage failures quickly.
- When integrations degrade or syncs fail, I want visible failure summaries and safe retry actions so I can restore service without corrupting internal business truth.
- When admins manage metadata, notifications, and integrations, I want a consolidated control surface so operational setup does not fragment across disconnected screens.
- When business actions occur, I want auditable records separate from technical logs so I can investigate what happened without reading raw infrastructure output.
- When access is restricted, I want authentication and RBAC to be reliable and explainable so admin operations are secure and supportable.

### Planning implications

- provider-grade authentication and governed operator actions are now the main admin-facing priorities
- rollout evidence, diagnostics fidelity, and investigation workflow depth are more valuable than adding new raw admin pages

## Team Delivery Manager

### Core JTBDs

- When I run delivery through squads or teams, I want a team-level view of members, assignments, project spread, and delivery anomalies so I can manage execution as a delivery unit.
- When my team is allocated across multiple projects, I want to see where planned staffing and observed work diverge so I can surface execution risk early.
- When team composition changes, I want member add/remove workflows and eventually effective-dated team history so I can keep the team model operationally trustworthy.
- When I need to coordinate with project and resource managers, I want team-level information that stays separate from org units and projects so the operating model remains clear.
- When delivery issues are caused by staffing gaps, I want rapid visibility from team scope into the affected assignments and projects so I can escalate the right operational action.

### Planning implications

- team dashboard now exists; the next gain is deeper anomaly drilldown and exception handoff
- team analytics should continue evolving without collapsing teams into org units or manager-subtree views

## Cross-persona prioritization signals

The strongest multi-persona opportunities are:

1. provider-grade authentication and self-scope hardening
2. operator actions on exceptions and reconciliation items
3. durable hardening of supporting subsystems such as notifications and summary reads
4. deeper cross-linking between dashboards, exceptions, audit, and lifecycle actions
5. scale-oriented read-model optimization
