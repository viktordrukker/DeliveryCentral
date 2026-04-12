# Scenario: Org Restructure

## Purpose

This scenario models a deterministic enterprise restructuring event where reporting lines and org memberships change without destroying historical truth or touching assignment ownership.

Files:

- [org-restructure.fixture.ts](C:\VDISK1\DeliveryCentral\test\scenarios\org-restructure\org-restructure.fixture.ts)
- [org-restructure.scenario.spec.ts](C:\VDISK1\DeliveryCentral\test\scenarios\org-restructure\org-restructure.scenario.spec.ts)

## Business Event

Effective on `2025-06-01T00:00:00.000Z`:

- Ethan Brooks moves from `Application Engineering` to `Strategic Programs Office`
- Mia Lopez moves from `Application Engineering` to `Data Engineering`
- Ethan and Mia stop reporting solid-line to Sophia Kim
- Ethan and Mia begin reporting solid-line to Noah Bennett
- Ethan keeps a dotted-line relationship to Lucas Reed
- Mia keeps a dotted-line relationship to Lucas Reed

## What the Scenario Verifies

### Manager resolution changes correctly

Before the restructure:

- Ethan Brooks -> Sophia Kim

After the restructure:

- Ethan Brooks -> Noah Bennett

### Historical reporting chain remains reconstructable

Before the restructure:

- Ethan Brooks -> Sophia Kim -> Olivia Chen

After the restructure:

- Ethan Brooks -> Noah Bennett -> Ava Rowe

### Assignments remain intact

The scenario asserts that seeded project assignments remain valid and active across the org restructure window. Reporting changes do not rewrite assignment truth.

### Visibility scope changes without destroying dotted-line visibility

Before the restructure:

- Sophia Kim has Ethan Brooks and Mia Lopez in solid-line scope

After the restructure:

- Sophia Kim loses that direct-report scope
- Noah Bennett gains that solid-line scope
- Lucas Reed still has dotted-line visibility over the affected people

## Determinism

The scenario is deterministic:

- fixed effective dates
- fixed person ids
- fixed org-unit ids
- seeded assignment references reused from the demo dataset

## Why This Matters

This is close to a real enterprise operating model change:

- people move between departments
- approval routing candidates change
- manager dashboards must reflect new reality
- historical audit and prior-period reporting must still resolve correctly

The scenario protects against destructive “current-state only” implementations.
