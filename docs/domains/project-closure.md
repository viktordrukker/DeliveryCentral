# Project Closure

## Scope

Project closure finalizes the internal project lifecycle and produces a workspend summary from actual work evidence.

## Command

- `POST /projects/{id}/close`
- `POST /projects/{id}/close-override`

## Lifecycle rule

- projects close through `ACTIVE -> CLOSED`

## Validation

- project must exist
- project can only be closed from `ACTIVE`
- normal closure is blocked while active assignments still exist

## Override workflow

Project closure conflicts are not silently bypassed.

When active assignments still exist, the normal close command returns a conflict.
An explicit override path exists for elevated operators.

Override requirements:

- stronger authorization than ordinary project closure
- authenticated actor capture
- mandatory reason capture
- business-audit visibility

The override bypasses the staffing conflict only. It does not bypass the core
project lifecycle rule that only `ACTIVE` projects can close.

## Workspend source of truth

Closure summaries use `WorkEvidence` only.

That means:

- assignments are not used to compute closure totals
- assignments remain intact for historical staffing visibility
- closure does not delete or rewrite assignment history

## Summary shape

The closure response returns:

- total mandays
- mandays by role
- mandays by skillset

## Aggregation notes

- mandays are derived from `durationMinutes / MINUTES_PER_MANDAY`
- roles come from the linked internal employee profile when available
- skillset effort is split evenly across the employee's listed skillsets so total mandays are not double-counted
- if role or skillset data is missing, the summary uses `UNSPECIFIED`

## Exception visibility

If a project is closed through override while active assignments remain, the
resulting condition stays visible through the exception queue as
`PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS` until the underlying staffing
condition is resolved.
