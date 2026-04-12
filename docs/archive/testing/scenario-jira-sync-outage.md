# Scenario: Jira Sync Outage

## Purpose

This scenario verifies that Jira project synchronization can fail without corrupting internal project truth or staffing truth.

Files:

- [fake-jira-sync-scenario.adapter.ts](C:\VDISK1\DeliveryCentral\test\scenarios\jira-sync-outage\fake-jira-sync-scenario.adapter.ts)
- [jira-sync-outage.scenario.spec.ts](C:\VDISK1\DeliveryCentral\test\scenarios\jira-sync-outage\jira-sync-outage.scenario.spec.ts)

## Scenario Shape

1. Jira project sync succeeds and imports a project into the internal project registry.
2. A later sync attempt fails deterministically with a timeout or outage error.
3. The imported internal project remains stable.
4. The external link remains intact.
5. The previous successful external sync state remains available.
6. The integration-status layer records the failure marker.
7. Existing `ProjectAssignment` data remains unchanged throughout.

## What Is Verified

### Successful import path

- internal `Project` is created
- `ProjectExternalLink` is created
- `ExternalSyncState` is written as `SUCCEEDED`
- success events are published

### Later outage path

- sync throws a deterministic failure
- imported `Project` is not deleted or rewritten incorrectly
- `ProjectExternalLink` remains stable
- last successful sync metadata remains intact
- integration status exposes a failed outcome and summary
- no `ProjectAssignment` mutation occurs

## Why This Matters

Jira is an integration source, not the staffing system of record.

An outage must not:

- delete or corrupt internal projects
- rewrite staffing assignments
- blur the boundary between external catalog sync and internal staffing truth

This scenario protects that boundary with a deterministic, CI-safe fake adapter.

## Determinism

The scenario is deterministic:

- fixed imported project key: `PORTFOLIO`
- fixed success then failure sequence
- fixed outage messages
- no live HTTP dependency on Jira
