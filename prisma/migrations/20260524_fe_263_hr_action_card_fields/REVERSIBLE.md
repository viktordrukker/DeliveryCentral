# Reversible migration

Pure additive — 3 nullable date columns on `Person`
(`probationEndsAt`, `contractEndsAt`, `lastHrReviewAt`) and 1 nullable
date column on `person_skills` (`certificationExpiresAt`). All default
NULL; HR action-cards service treats NULL as "no card raised".

Rollback drops all 4 columns. Any values populated after this migration
shipped will be lost on rollback. See `rollback.sql`.
