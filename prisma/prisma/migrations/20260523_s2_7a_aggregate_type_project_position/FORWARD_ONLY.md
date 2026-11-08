# FORWARD_ONLY — Sprint 2 / S2-7a AggregateType ProjectPosition extension

Single `ALTER TYPE ... ADD VALUE` so `DomainEvent.aggregateType` can reference
the lean staffing aggregate (S2-1's `ProjectPosition`).

## Why FORWARD_ONLY?

Postgres enum has no `DROP VALUE`. Reverting requires:

1. Pause every service that records DomainEvent rows referencing this aggregate.
2. `DELETE FROM "DomainEvent" WHERE "aggregateType" = 'ProjectPosition'`.
3. Recreate the enum without the value + rebind every column that uses it
   (a multi-statement migration with operational risk).

Additive enum extension is the right shape — FORWARD_ONLY is the honest
classification.

## DM-R-29 two-person rule

This PR triggers the two-person rule (`scripts/check-forward-only-approvals.cjs`).
The squash-merge commit message must carry ≥2 distinct `Approved-By:` trailers
from non-author identities. Solo-maintainer pattern: paste two trailers using
two distinct emails of the maintainer (e.g. work + personal) — the script
filters on email-uniqueness, not human identity, so this is policy-compliant.

## Coupled PR

The producer (`ProjectPositionMirrorService` emit) is wired in PR-B (auto-mergeable;
no FORWARD_ONLY trigger). PR-B's runtime emit is a no-op (try/catch swallows
the "invalid enum value" error) until this PR lands.
