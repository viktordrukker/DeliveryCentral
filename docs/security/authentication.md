# Authentication

_Last reconciled: 2026-05-23 (post Sprint F-8). Auth strategy + identity surface have been substantially extended since the original 2026-04 doc._

## Scope

Authentication establishes who the caller is. Authorization is in [rbac.md](./rbac.md).

The platform supports **three identity sources** in production: local-account, OIDC (Entra-primary, IdP-agnostic), and LDAP / AD. All three converge on the same in-process `PrincipalModel` consumed by `RbacGuard` + `@AllowSelfScope` + `@ReadAction`.

## Identity sources

### Local-account (default)

- `LocalAccount` Prisma model — email + bcrypt password hash + 2FA secret + lockout state.
- `POST /api/auth/login` issues a signed JWT cookie + refresh token.
- `POST /api/auth/password-reset/request` + `/api/auth/password-reset/confirm` — `PasswordResetToken` model (single-use, time-boxed).
- 2FA TOTP enrollment + verify under `auth` controller.
- `RefreshToken` model — rotated on refresh, revocable.
- Bank-IT seed accounts at CLAUDE.md §10 (admin@deliverycentral.local + 7 role accounts in `it-company` profile).

### OIDC (D-155, Sprint F-4.4 / PR #44)

- `auth/oidc` controller — `/api/auth/oidc/login` + `/api/auth/oidc/callback`.
- Entra-primary; provider-agnostic via standard OIDC discovery.
- Bank-IT pivot decision (2026-05-10): OIDC is the primary IdP for bank installs.
- Token claims validated: `iss`, `aud`, `sub`, `email`, group claims.
- Group → role mapping: configured via `oidc.groupRoleMap` in `PlatformSetting`.

### LDAP / AD (NEW C1-LDAP, Sprint F-4.7 / PR #47)

- `src/shared/ldap/ldap-directory-adapter.ts` (uses `ldapts` MIT package — see CLAUDE.md approved packages).
- Pulls users + manager hierarchy + group membership.
- Maps groups → platform roles via `ldap.groupRoleMap`.
- Bind credentials in env (`LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`) — never committed.
- Schedule + cursor managed via `IntegrationSyncState` + appears in `/admin/integrations/registry`.

### M365 directory adapter

- `src/modules/integrations/m365/directory/`.
- Auto-provision: unmatched users create INACTIVE `Person` rows via `CreateEmployeeService`. Gated by `sso.autoProvisionUsers` (default ON; OFF routes unmatched users to UNMATCHED reconciliation for operator review — `M365DirectoryReconciliationRecord`). D-156, Sprint F-8.2.

## Principal model

`request.principal` shape (in-process):

```ts
{
  userId: string;           // LocalAccount.id or external sub
  personId?: string;        // Person.id (may be unset for system / unmatched)
  displayName: string;
  email: string;
  roles: PlatformRole[];    // see platform-role.ts (7 roles)
  tenantId?: string;        // DM-7.5 — single-tenant install today
  impersonatedBy?: { userId, displayName };  // when admin "View as" is active
}
```

`PlatformRole` is the const tuple in `src/modules/identity-access/domain/platform-role.ts`:

```ts
['employee', 'project_manager', 'resource_manager', 'director',
 'hr_manager', 'delivery_manager', 'admin']
```

"Dual-role" is a UX concept (user holding 2+ roles, e.g. RM+HR), not a separate role value.

## Impersonation overlay

Admin "View as" feature: an active admin can overlay any other person's identity for read flows + UI checks. `useAuth()` in the frontend returns the impersonated `principal` transparently — all downstream code (dashboards, role guards, data hooks) automatically reflects the impersonated user. Original admin id surfaces as `impersonatedBy` for audit. See CLAUDE.md Pitfall #13.

## JWT layer

- Cookies: `dc_access` (short-lived JWT) + `dc_refresh` (refresh token).
- Server-side, `Authorization: Bearer <token>` headers are also accepted (useful for SDK / Swagger).
- Signed with HMAC; key rotation via env (`AUTH_JWT_SECRET`).
- Issuer / audience claims validated (`AUTH_ISSUER`, `AUTH_AUDIENCE`).

## Environment

| Var | Purpose |
|---|---|
| `AUTH_JWT_SECRET` | HMAC signing key (rotate out-of-band) |
| `AUTH_ISSUER` | Token issuer claim |
| `AUTH_AUDIENCE` | Token audience claim |
| `OIDC_ISSUER_URL` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` | OIDC config (D-155) |
| `LDAP_URL` / `LDAP_BIND_DN` / `LDAP_BIND_PASSWORD` | LDAP / AD adapter (NEW C1-LDAP) |

The legacy `AUTH_ALLOW_TEST_HEADERS` raw-header path described in the 2026-04 doc has been retired in normal runtime. Tests use minted bearer tokens or the dev-mode bootstrap.

## Setup wizard auth path

The in-app `/setup` wizard (CLAUDE.md §10) is gated by a one-time `X-Setup-Token` (issued in `docker logs` at first boot). Operators paste it on first visit, then run through the 8 screens (preflight → migrations → tenant → admin → integrations → monitoring → seed → complete). Once the admin account is created, the setup token is invalidated.

## Security notes

- Never expose `AUTH_JWT_SECRET` in frontend code or browser-visible config.
- Never use raw `x-platform-*` headers as real authentication in normal runtime.
- Rotate shared secrets outside version control.
- Hash-chained `AuditLog` records every privileged action; D-167 v1 redact-payload (Sprint F-5.5) replaces PII fields after right-to-erasure requests.
- Tenant isolation gaps tracked at D-153 / D-154 in MASTER_TRACKER (P0 for any future SaaS pivot; non-blocking for bank-IT single-tenant install).
