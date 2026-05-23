# FORWARD_ONLY — Sprint 2 / S2-7 AggregateType ProjectPosition extension

Single ADD VALUE to the `AggregateType` enum so that DomainEvent rows can
reference the lean staffing aggregate.

## Why FORWARD_ONLY?

Postgres enum ADD VALUE is one-way — there's no built-in `DROP VALUE`. If
this needed to be reverted, the operator would have to:

1. Pause any service that records DomainEvent rows referencing this aggregate.
2. Delete any existing DomainEvent rows where `aggregateType = 'ProjectPosition'`.
3. Recreate the enum without the value and rebind every column that uses
   it (`DomainEvent.aggregateType`) — a multi-statement migration that
   carries operational risk.

Given the change is additive and the mirror-write code in S2-6 is the only
producer, FORWARD_ONLY is the right classification.

## Two-person rule note

This migration affects the DomainEvent outbox shape. The two-person rule
(DM-R-29) applies — squash-merge commit message must carry ≥2 distinct
Approved-By trailers from non-author reviewers.
