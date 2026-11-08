-- DM-8-5 — person-level RLS on PII-bearing tables.
--
-- Complements DM-7.5-5 tenant isolation with a second policy that
-- restricts SELECT/UPDATE/DELETE to rows where the Person-identifier
-- matches the current session's `app.current_person_id`. PII
-- tables listed below carry sensitive personal data that a generic
-- tenant member should not be able to read about other persons.
--
-- Policies CREATED but RLS not yet enabled — same two-release
-- pattern as DM-7.5-5. Cutover command per-table:
--   ALTER TABLE "LocalAccount" ENABLE ROW LEVEL SECURITY;
--
-- `app.current_person_id` is set by the DM-7.5-4 tenant resolver
-- middleware (extended in DM-8-5b).
--
-- Covered tables (PII-heavy, per-person scope):
--   LocalAccount (auth secrets)
--   PasswordResetToken
--   RefreshToken
--   contacts (phone/address/alt email)
--
-- `Person.primaryEmail` + `Person.displayName` are intentionally NOT
-- person-restricted here — colleagues routinely need to see each
-- other's name/email in the directory. RBAC (already in place)
-- handles read restrictions when needed.
--
-- Classification: REVERSIBLE.

CREATE OR REPLACE FUNCTION "dm_r_current_person"() RETURNS uuid
LANGUAGE plpgsql STABLE
AS $fn$
BEGIN
  RETURN NULLIF(current_setting('app.current_person_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END
$fn$;

-- LocalAccount — owner-only + admin.
DROP POLICY IF EXISTS "LocalAccount_owner_isolation" ON "LocalAccount";
CREATE POLICY "LocalAccount_owner_isolation" ON "LocalAccount"
  USING ("personId" = "dm_r_current_person"())
  WITH CHECK ("personId" = "dm_r_current_person"());

-- RefreshToken — keyed via accountId → LocalAccount.personId.
DROP POLICY IF EXISTS "RefreshToken_owner_isolation" ON "RefreshToken";
CREATE POLICY "RefreshToken_owner_isolation" ON "RefreshToken"
  USING (
    "accountId" IN (
      SELECT id FROM "LocalAccount" WHERE "personId" = "dm_r_current_person"()
    )
  )
  WITH CHECK (
    "accountId" IN (
      SELECT id FROM "LocalAccount" WHERE "personId" = "dm_r_current_person"()
    )
  );

-- PasswordResetToken — same join path.
DROP POLICY IF EXISTS "PasswordResetToken_owner_isolation" ON "PasswordResetToken";
CREATE POLICY "PasswordResetToken_owner_isolation" ON "PasswordResetToken"
  USING (
    "accountId" IN (
      SELECT id FROM "LocalAccount" WHERE "personId" = "dm_r_current_person"()
    )
  )
  WITH CHECK (
    "accountId" IN (
      SELECT id FROM "LocalAccount" WHERE "personId" = "dm_r_current_person"()
    )
  );

-- contacts — owner-only (the Person whose contacts they are).
DROP POLICY IF EXISTS "contacts_owner_isolation" ON "contacts";
CREATE POLICY "contacts_owner_isolation" ON "contacts"
  USING ("personId" = "dm_r_current_person"())
  WITH CHECK ("personId" = "dm_r_current_person"());

COMMENT ON FUNCTION "dm_r_current_person"() IS
  'DM-8-5 — reads app.current_person_id session GUC; returns NULL if unset.';
