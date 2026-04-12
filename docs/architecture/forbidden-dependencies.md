# Forbidden Dependencies

## Hard rules

- `Integrations Hub` must not import `Assignment & Workload` internals.
- `Time & Work Evidence` must not directly import or mutate `Assignment & Workload` aggregates.
- `Project Registry` exclusively owns canonical `Project` and `ProjectExternalLink` domain definitions.
- `Organization & Org Chart` exclusively owns reporting structures, manager scope, and org hierarchy.
- `Customization / Metadata` must not depend on `Integrations Hub`.

## Reasoning

### Integrations to Assignment

External providers such as Jira are not authoritative staffing systems. Allowing adapter code to call assignment internals would make external data capable of mutating internal staffing truth.

### Work Evidence to Assignment

Work evidence is observational. Direct writes from evidence code into assignment code would collapse the critical distinction between planned work and observed work.

### Registry ownership of project identity

Internal project identity must survive provider changes, outages, or multiple external links. If other contexts define `Project` independently, identity drift follows.

### Organization ownership of reporting structures

Reporting lines change historically and may distinguish line management from dotted-line visibility. That model must have one owner.

### Metadata isolation

Metadata is a platform capability. If it depends on integrations, schema customization becomes coupled to specific providers and stops being platform-level.

## Enforcement mechanism

These rules are enforced by [`.dependency-cruiser.cjs`](C:\VDISK1\DeliveryCentral\.dependency-cruiser.cjs) and the `npm run check:architecture` script.
