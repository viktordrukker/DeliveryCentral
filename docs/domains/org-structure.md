# Org Structure

## Scope

Org structure owns effective-dated reporting relationships between employees.

## Manager assignment

The platform supports assigning a solid-line manager through:

- `POST /org/reporting-lines`

### Request fields

- `personId`
- `managerId`
- `type`
- `startDate`
- `endDate` optional

For the current slice, `type` is restricted to `SOLID`.

## Domain rules

- only one solid-line manager may be active for a person during a given effective period
- future-dated manager changes are allowed
- reporting lines are appended, not overwritten
- historical reporting truth must remain reconstructable

## Preservation of history

Manager changes do not update old rows in place.

Instead:

- the existing reporting line remains for its original effective period
- a new reporting line is added for the next effective period

This keeps current and historical manager resolution queryable over time.

## Overlap rule

When creating a new solid-line manager assignment, the system rejects any effective-date range that overlaps another solid-line manager assignment for the same person.

This applies to:

- current periods
- future-dated periods
- open-ended periods

## Current implementation note

The slice currently focuses on solid-line manager assignment.
Dotted-line relationships remain supported by the domain model and repository layer, but are not part of this write endpoint yet.
