# F-40 / D-103 + DM-5-5 round 10 — actor-audit on OvertimePolicy + PlatformSetting

Adds `createdByPersonId` + `updatedByPersonId` (nullable, FK → Person, SET NULL) to `overtime_policies` and `platform_settings`. After this batch, **20/105** aggregates carry the columns.

- `OvertimePolicy` has `setByPersonId` (business actor); canonical pair brings it into uniform shape.
- `PlatformSetting` has a legacy `updatedBy String?` text column; canonical UUID-FK pair adds proper FK linkage.

Rollback drops all 4 added columns + 4 FKs + 4 indexes. Idempotent.
