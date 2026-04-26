-- DM-8-6 — PII / secret class markers via COMMENT ON COLUMN.
--
-- Convention (schema-conventions.md §K):
--   'pii:secret'       — reversible secrets (2FA seed, session tokens)
--   'pii:hash'         — one-way hashed secrets (password, tokens)
--   'pii:email'        — email address
--   'pii:name'         — natural-person name
--   'pii:other'        — other PII (address, phone)
--
-- Operators query `pg_description` to enumerate sensitive columns for
-- data-subject requests, backup redaction, log scrubbing, and
-- replication policy:
--   SELECT c.table_name, c.column_name, d.description
--   FROM information_schema.columns c
--   JOIN pg_description d ON d.objoid = (c.table_name::regclass)::oid
--   AND d.objsubid = c.ordinal_position;
--
-- Envelope encryption for `twoFactorSecret` (the only reversible secret
-- in the schema) is a follow-up — requires KMS wiring.
--
-- Classification: REVERSIBLE (rollback removes comments).

-- ------------------------------------------------ reversible secrets
COMMENT ON COLUMN "LocalAccount"."twoFactorSecret" IS 'pii:secret';

-- ------------------------------------------------- one-way hashes
COMMENT ON COLUMN "LocalAccount"."passwordHash" IS 'pii:hash';
COMMENT ON COLUMN "LocalAccount"."backupCodesHash" IS 'pii:hash';
COMMENT ON COLUMN "PasswordResetToken"."tokenHash" IS 'pii:hash';
COMMENT ON COLUMN "RefreshToken"."tokenHash" IS 'pii:hash';

-- ------------------------------------------------ personal identifiers
COMMENT ON COLUMN "Person"."primaryEmail" IS 'pii:email';
COMMENT ON COLUMN "Person"."givenName" IS 'pii:name';
COMMENT ON COLUMN "Person"."familyName" IS 'pii:name';
COMMENT ON COLUMN "Person"."displayName" IS 'pii:name';
COMMENT ON COLUMN "Person"."location" IS 'pii:other';

-- DM-6a-4 Contact rows are all PII by construction.
COMMENT ON COLUMN "contacts"."value" IS 'pii:other';
