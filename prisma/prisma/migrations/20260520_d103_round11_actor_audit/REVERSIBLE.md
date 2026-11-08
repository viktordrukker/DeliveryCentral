# F-42 / D-103 + DM-5-5 round 11 — actor-audit on Client + Vendor

Adds `createdByPersonId` + `updatedByPersonId` (nullable, FK → Person, SET NULL) to `clients` and `vendors`. After this batch, **22/105** aggregates carry the columns.

- `Client` has `accountManagerPersonId` (business actor); new columns capture row author + last editor.
- `Vendor` had no actor at all (admin-curated).

Rollback drops all 4 added columns + 4 FKs + 4 indexes. Idempotent.
