# REVERSIBLE — NEW-LGL-3 CustomRole CRUD

This migration is reversible (DM-R-4 classification).

## What rolling back does

`rollback.sql` drops the new `custom_roles` table and its indexes / FKs.
The table is brand-new and has no dependents at migration time, so the
rollback is a clean DROP.

## When rollback is safe

Always — until any downstream consumer (Phase 6+ identity-binding that
expands a user's effective `roles` claim to include `inheritedRoles` of
their assigned custom roles) starts hard-failing on missing rows. At
ship time no downstream consumer exists yet; the admin UI simply lists
roles and persists definitions. Rollback is data-safe.
