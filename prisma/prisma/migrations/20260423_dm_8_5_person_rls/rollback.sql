DROP POLICY IF EXISTS "contacts_owner_isolation" ON "contacts";
DROP POLICY IF EXISTS "PasswordResetToken_owner_isolation" ON "PasswordResetToken";
DROP POLICY IF EXISTS "RefreshToken_owner_isolation" ON "RefreshToken";
DROP POLICY IF EXISTS "LocalAccount_owner_isolation" ON "LocalAccount";
DROP FUNCTION IF EXISTS "dm_r_current_person"();
