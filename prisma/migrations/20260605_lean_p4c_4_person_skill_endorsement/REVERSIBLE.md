# Reversible migration

Pure additive — two nullable columns (`endorsedByPersonId`,
`endorsedAt`), one FK to `Person`, one index on `endorsedByPersonId`.
Existing rows keep their semantics because both columns default to
NULL ("not yet endorsed"). Self-endorsed rows that managers haven't
reviewed yet remain visible in the queue (selfEndorsed=true AND
endorsedByPersonId IS NULL).

Rollback drops the index, the FK, then both columns. Any approval
decisions written after this migration shipped will be lost on
rollback (the rows themselves stay; only the endorsement audit
disappears). See `rollback.sql`.
