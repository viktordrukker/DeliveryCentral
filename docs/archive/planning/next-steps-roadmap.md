> **ARCHIVED** — This document is retained for historical reference. All phases are complete as of 2026-04-08. See [Current State](../current-state.md) for active status.

# Next Steps Roadmap

This roadmap is prioritized for the next iteration.

It is ordered by operational leverage, not by novelty.

## Planning inputs

Use these supporting documents together with this roadmap:

- [Current state](./current-state.md)
- [Backend to frontend gap map](./frontend-gap-map.md)
- [Persona JTBDs](./persona-jtbds.md)
- [Agent handoff](./agent-handoff.md)

## What changed since the previous roadmap

The previous roadmap emphasized:

- converging core runtimes onto durable persistence
- replacing header-scaffold auth
- finishing lifecycle UI parity
- building audit, exceptions, and dashboard surfaces

That work is now substantially complete.

The next iteration should not spend its energy rediscovering already-shipped slices.

## Priority 1: Harden identity and governed access

### Why this comes first

The platform now has broad protected write/admin workflows.
The limiting factor is no longer RBAC semantics. It is identity-provider maturity and governed session behavior.

### Recommended slices

1. Integrate bearer-token validation with a real provider-grade OIDC/JWKS flow.
2. Roll out self-scope enforcement on employee-facing and manager-sensitive routes.
3. Add frontend session/token handling that is less operator-manual for protected admin flows.
4. Add clearer unauthorized/session-expired UX for admin and override workflows.

### Acceptance target

- normal runtime identity is provider-backed rather than locally signed only
- self-scope is explicit where the business rule is clear
- protected frontend workflows remain usable without ad hoc token juggling

## Priority 2: Deepen exception and reconciliation operator workflows

### Why this comes second

The platform now exposes exceptions, audit, notification outcomes, sync history, and reconciliation review.
What it lacks is operator action depth.

### Recommended slices

1. Add explicit operator actions for exception items where architecture allows:
   - acknowledge
   - mark reviewed
   - attach follow-up note or reason
2. Add operator actions for integration reconciliation review:
   - acknowledge
   - ignore with reason
   - mark resolved internally
3. Add filtered deep links between:
   - exception queue
   - team dashboard anomalies
   - project lifecycle conflicts
   - business audit results
4. Add saved investigation presets for admin/governance workflows.

### Acceptance target

- anomalies are not only visible; they are operable
- reconciliation items can be reviewed without drifting into raw logs
- operator navigation between related governance surfaces is tighter

## Priority 3: Finish remaining runtime hardening

### Why this matters

Core business contexts are durable, but some supporting subsystems and summary paths still need verification or final convergence.

### Recommended slices

1. Verify and, if needed, converge notification request/delivery runtime storage into a durable live path.
2. Tighten restart-persistence checks for admin, dashboard, and operator-read paths.
3. Remove remaining stale demo-runtime assumptions in summary/query services and validation helpers.
4. Keep docs and self-check rules aligned with the real runtime path.

### Acceptance target

- supporting operational subsystems behave durably under restart
- self-check and readiness docs reflect the real runtime instead of mixed assumptions

## Priority 4: Optimize high-value read paths under enterprise load

### Why this matters

The platform now has enough functionality that the next visible failure mode is performance and read-model correctness at scale.

### Recommended slices

1. Continue query/read-model optimization for:
   - manager scope
   - team dashboard
   - role dashboards
   - workload summary
   - exceptions
   - audit browsing
2. Add more scale-oriented smoke checks tied to the bank-scale seed profile.
3. Add explicit thresholds or comparative baselines for the most used operator views.

### Acceptance target

- key dashboards and investigation surfaces remain responsive on large seeded datasets
- performance documentation remains concrete and reproducible

## Priority 5: Raise operator and rollout confidence

### Why this matters

The system now has UAT packs, drills, self-checks, and role dashboards.
The next gap is controlled rollout confidence rather than missing raw capability.

### Recommended slices

1. Add browser-driven UAT coverage for the role dashboard pack.
2. Add stricter self-check or CI/staging gating modes for rollout.
3. Add artifact-style outputs for drills and readiness checks so teams can attach evidence to rollout records.
4. Expand manual UAT docs to cover override and exception-resolution flows.

### Acceptance target

- staging/UAT signoff can be supported by runnable, reviewable evidence
- operator drills and readiness checks become part of release practice, not just local scripts

## Priority 6: Improve role-specific workflow depth

### Why this matters

The main role surfaces exist. The next gains come from making them more useful, not from creating yet another dashboard.

### Recommended slices

1. Project Manager:
   - hydrate project details further with more human-readable staffing and manager context
   - add tighter project-to-assignment navigation and action loops
2. Resource Manager:
   - add filtered exception handoff from team and capacity views
   - improve assignment conflict visibility and reassignment loops
3. HR:
   - deepen org-governance controls and audit handoff from employee lifecycle screens
4. Team Delivery:
   - deepen anomaly drilldown from team dashboard into exceptions, people, and projects
5. Admin:
   - improve saved filters and investigation presets for monitoring, notifications, audit, and integrations

### Acceptance target

- role dashboards become action hubs rather than read-only summaries

## High-value concrete task candidates for the next AI agent

If choosing one concrete next task, prefer one of these:

1. Provider-grade OIDC/JWKS integration with preserved RBAC semantics.
2. Durable notification request/delivery runtime verification and convergence.
3. Exception and reconciliation acknowledgement/review actions with auditability.
4. Filtered deep-linking between team anomalies, exceptions, audit, and project conflict views.
5. Browser-level dashboard UAT pack for PM, RM, HR, Team Delivery, and Admin.
6. Further read-model optimization for manager scope, dashboards, exceptions, and audit browsing.

## Persona lens for prioritization

Use these JTBD anchors when choosing between equally feasible tasks:

- Project Manager:
  - prioritize actionability from project lifecycle, staffing conflict, and anomaly views
- Resource Manager:
  - prioritize exception handoff, reassignment efficiency, and capacity-to-action loops
- HR Personnel:
  - prioritize governance visibility, historical traceability, and self-scope correctness
- System Administrator:
  - prioritize provider-grade auth, operator actions, diagnostics fidelity, and rollout evidence
- Team Delivery Manager:
  - prioritize anomaly drilldown and team-to-exception/project navigation

For the full JTBD set, see [Persona JTBDs](./persona-jtbds.md).

## Tasks to avoid doing first

Avoid spending the next iteration on:

- broad new CRUD/UI surfaces that already exist
- additional dashboard variants without stronger actionability
- adding more integrations before operator review flows deepen
- visual polish that does not improve operational clarity

The highest-value work now is depth, trustworthiness, and rollout confidence.
