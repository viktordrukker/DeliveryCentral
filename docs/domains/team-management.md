# Team Management

## Purpose

Team management provides a durable operational grouping for staffing visibility
and coordination.

## Boundary

The live runtime team model is backed by `ResourcePool` and
`PersonResourcePoolMembership`.

That means:

- Team is not the same thing as `OrgUnit`
- Team is not the same thing as `Project`
- Team membership is not assignment history

## Durable runtime

The live runtime now persists:

- team creation through `ResourcePool`
- add or remove member changes through `PersonResourcePoolMembership`
- effective membership end dating through `validTo`

Team create and member changes survive restart because the runtime path reads and
writes PostgreSQL-backed rows rather than seeded in-memory structures.

## Supported workflows

- create team
- add member
- remove member
- list teams
- view team members
- view team dashboard

## Domain rules

- Teams remain operational staffing units.
- Org units remain organizational hierarchy units.
- Projects remain delivery and commercial units of work.
- Assignment truth remains in the Assignments context.

## Runtime notes

- Team APIs preserve their existing HTTP contracts.
- Team dashboard reads now use durable assignment and project data instead of
  seeded demo arrays.
- In-memory implementations remain available for focused tests only.
