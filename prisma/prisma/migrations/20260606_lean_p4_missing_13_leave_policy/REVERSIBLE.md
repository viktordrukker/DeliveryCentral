# REVERSIBLE — LEAN-P4-missing-13 LeavePolicy CRUD

This migration is reversible (DM-R-4 classification).

## What rolling back does

`rollback.sql` drops the new `leave_policies` table and its indexes / FKs.
The table is brand-new and has no dependents at migration time, so the
rollback is a clean DROP.

## When rollback is safe

Always — until any downstream consumer (LeaveBalanceService default
entitlement lookup) starts hard-failing on missing policy rows. The
service falls back to legacy constants when no policy is found, so
the rollback is data-safe at every point.
