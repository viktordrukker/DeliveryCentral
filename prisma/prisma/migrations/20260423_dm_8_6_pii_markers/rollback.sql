-- DM-8-6 rollback — drop PII markers.
COMMENT ON COLUMN "LocalAccount"."twoFactorSecret" IS NULL;
COMMENT ON COLUMN "LocalAccount"."passwordHash" IS NULL;
COMMENT ON COLUMN "LocalAccount"."backupCodesHash" IS NULL;
COMMENT ON COLUMN "PasswordResetToken"."tokenHash" IS NULL;
COMMENT ON COLUMN "RefreshToken"."tokenHash" IS NULL;
COMMENT ON COLUMN "Person"."primaryEmail" IS NULL;
COMMENT ON COLUMN "Person"."givenName" IS NULL;
COMMENT ON COLUMN "Person"."familyName" IS NULL;
COMMENT ON COLUMN "Person"."displayName" IS NULL;
COMMENT ON COLUMN "Person"."location" IS NULL;
COMMENT ON COLUMN "contacts"."value" IS NULL;
