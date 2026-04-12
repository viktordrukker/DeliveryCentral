> **ARCHIVED** — This document is retained for historical reference. All phases are complete as of 2026-04-08. See [Current State](../current-state.md) for active status.

# WSL Agent Handoff — DeliveryCentral Implementation

**Written:** 2026-04-04  
**Status:** Phase 0 complete. Phase 1 backend partially complete. Phase 1 frontend not started.  
**Goal:** Complete Phase 1 (Auth & Authorization layer) so the system can be started locally and logged into as superadmin with no external dependencies.

---

## Read first

Before touching anything, read these four files in full:

1. `docs/planning/current-state.md` — what already exists
2. `docs/planning/next-steps-roadmap.md` — priority order
3. `docs/planning/persona-jtbds.md` — JTBD anchors
4. `docs/security/authentication.md` + `docs/security/rbac.md` — existing auth contracts

---

## What was completed before this handoff

### Phase 0 — Infrastructure scaffolding (ALL DONE)

| File | What was done |
|---|---|
| `Dockerfile` | Added `builder` + `production` stages. `apt-get upgrade` in all debian stages for CVE patches. Non-root `appuser` in production. |
| `frontend/Dockerfile` | Added `builder` + `production` stages. Production uses `nginx:1.27-alpine`. |
| `frontend/nginx.conf` | NEW — SPA routing (`try_files`), gzip, security headers, asset cache. |
| `docker-compose.prod.yml` | NEW — Full production stack: postgres, migrate, backend, frontend, caddy. No source mounts. All secrets from env. |
| `Caddyfile` | NEW — Reverse proxy: `/api/*` → backend:3000, `*` → frontend:80. Let's Encrypt via `$CADDY_DOMAIN`. |
| `docker-compose.yml` | Added `ldap-test` service (bitnami/openldap:2.6) under `tools` profile. |
| `.github/workflows/deploy.yml` | NEW — Build → GHCR push → SSH deploy → health check → rollback. |
| `.github/workflows/ci.yml` | Replaced — now has `backend` job, `frontend` job, and `build-check` job (production image smoke test). |
| `.github/pull_request_template.md` | NEW — JTBD-anchored checklist. |
| `.env.example` | Fully replaced — all feature toggles documented, superadmin seed vars, grouped by concern. |

### Phase 1 backend — partial

| Item | Status |
|---|---|
| `delivery_manager` added to `src/modules/identity-access/domain/platform-role.ts` | DONE |
| `LocalAccount`, `RefreshToken`, `PasswordResetToken` appended to `prisma/schema.prisma` | DONE |
| npm package installs | **NOT DONE — blocked on Windows shell, do this first** |
| AuthModule, AppConfig update, app.module.ts, seed.ts | NOT DONE |

### Phase 1 frontend — nothing done yet

---

## Governing rules — read these before writing a single line

1. **Feature toggle contract** — every external dep has an `ENABLED` env var defaulting to `false`. The system must start with zero external services. See `.env.example` for the full toggle map.
2. **Minimum viable local set** after seed: `admin@deliverycentral.local` / `DeliveryCentral@Admin1` works immediately, no SMTP, no LDAP, no Azure AD, no 2FA required.
3. **Do not break existing API contracts** — all existing endpoints stay as-is. The new `/auth/*` endpoints are additive.
4. **Bounded contexts stay sovereign** — the new `AuthModule` lives in `src/modules/auth/`. Do not touch `IdentityAccessModule` internals — it handles the existing RBAC guard which must keep working.
5. **`RequestPrincipal` interface is shared** — the new auth flow must still produce a `RequestPrincipal` that the existing `RbacGuard` can consume. The `authSource` field should use `'bearer_token'` for JWT-issued tokens.
6. **Existing dev bootstrap stays** — `AUTH_DEV_BOOTSTRAP_ENABLED` and `AUTH_ALLOW_TEST_HEADERS` continue to work as before. They are escape hatches for automated tests.
7. **Docker-only local runtime** — do not change how `docker compose up` works. The new auth runs inside the same containers.

---

## Step 1 — Install packages (do this first in WSL)

```bash
cd /path/to/DeliveryCentral

# Backend auth packages
npm install --save \
  @nestjs/passport @nestjs/jwt \
  passport passport-local passport-jwt passport-ldapauth \
  bcrypt otplib qrcode openid-client

npm install --save-dev \
  @types/passport-local @types/passport-jwt \
  @types/bcrypt @types/qrcode

# Frontend UI + auth packages
cd frontend
npm install --save \
  @mui/material @mui/icons-material \
  @mui/x-data-grid @mui/x-date-pickers \
  @emotion/react @emotion/styled \
  recharts \
  @xyflow/react \
  date-fns

cd ..
```

---

## Step 2 — Create Prisma migration

The schema already has the three new models. Generate and apply the migration:

```bash
# Inside the running postgres container or with DATABASE_URL set:
docker compose up -d postgres
docker compose run --rm migrate
# Then generate a named migration for the new auth tables:
npx prisma migrate dev --name add-auth-local-accounts
```

---

## Step 3 — Backend: Update AppConfig

File: `src/shared/config/app-config.ts`

Add these new fields to the class and populate them in the constructor from `process.env`:

```typescript
// Feature toggles
public readonly authLocalEnabled: boolean;         // AUTH_LOCAL_ENABLED
public readonly authLdapEnabled: boolean;          // AUTH_LDAP_ENABLED
public readonly authAzureAdEnabled: boolean;       // AUTH_AZURE_AD_ENABLED

// Token lifetimes (seconds)
public readonly authAccessTokenExpiresIn: number;  // AUTH_ACCESS_TOKEN_EXPIRES_IN (default: 900)
public readonly authRefreshTokenExpiresIn: number; // AUTH_REFRESH_TOKEN_EXPIRES_IN (default: 604800)
public readonly authPasswordResetExpiresIn: number;// AUTH_PASSWORD_RESET_EXPIRES_IN (default: 3600)

// Account security
public readonly authMaxFailedAttempts: number;     // AUTH_MAX_FAILED_ATTEMPTS (default: 5)
public readonly authLockoutDurationMinutes: number;// AUTH_LOCKOUT_DURATION_MINUTES (default: 15)

// 2FA
public readonly auth2faEnforceRoles: PlatformRole[]; // AUTH_2FA_ENFORCE_ROLES (comma-sep, default: [])
public readonly auth2faTotpIssuer: string;           // AUTH_2FA_TOTP_ISSUER (default: 'DeliveryCentral')

// SMTP toggle (existing SMTP fields stay, add the toggle)
public readonly smtpEnabled: boolean;              // SMTP_ENABLED (default: false)

// LDAP config (only read when authLdapEnabled)
public readonly authLdapUrl: string;               // AUTH_LDAP_URL
public readonly authLdapBindDn: string;            // AUTH_LDAP_BIND_DN
public readonly authLdapBindCredentials: string;   // AUTH_LDAP_BIND_CREDENTIALS
public readonly authLdapSearchBase: string;        // AUTH_LDAP_SEARCH_BASE
public readonly authLdapSearchFilter: string;      // AUTH_LDAP_SEARCH_FILTER (default: '(uid={{username}})')

// Azure AD config (only read when authAzureAdEnabled)
public readonly authAzureAdTenantId: string;       // AUTH_AZURE_AD_TENANT_ID
public readonly authAzureAdClientId: string;       // AUTH_AZURE_AD_CLIENT_ID
public readonly authAzureAdClientSecret: string;   // AUTH_AZURE_AD_CLIENT_SECRET
public readonly authAzureAdRedirectUri: string;    // AUTH_AZURE_AD_REDIRECT_URI
public readonly authOidcRoleClaim: string;         // AUTH_OIDC_ROLE_CLAIM (default: 'platform_roles')

// Seed admin (read by seed script only)
public readonly seedAdminEmail: string;            // SEED_ADMIN_EMAIL
public readonly seedAdminPassword: string;         // SEED_ADMIN_PASSWORD
public readonly seedAdminDisplayName: string;      // SEED_ADMIN_DISPLAY_NAME
```

---

## Step 4 — Backend: Create AuthModule

Directory structure to create:

```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/
│   ├── login.dto.ts
│   ├── refresh-token.dto.ts
│   ├── password-reset-request.dto.ts
│   ├── password-reset-confirm.dto.ts
│   ├── setup-2fa-response.dto.ts
│   └── verify-2fa.dto.ts
└── strategies/
    ├── local.strategy.ts      (passport-local, only registered when AUTH_LOCAL_ENABLED=true)
    ├── ldap.strategy.ts       (passport-ldapauth, only registered when AUTH_LDAP_ENABLED=true)
    ├── azure-ad.strategy.ts   (openid-client, only registered when AUTH_AZURE_AD_ENABLED=true)
    └── jwt-access.strategy.ts (passport-jwt, always registered — validates access tokens)
```

### auth.service.ts — method signatures

```typescript
// Local auth
login(email: string, password: string, userAgent?: string, ip?: string): Promise<LoginResult>
// LoginResult = { accessToken: string, refreshToken: string } | { requires2FA: true, tempToken: string }

refresh(refreshTokenRaw: string): Promise<{ accessToken: string, refreshToken: string }>
logout(refreshTokenRaw: string): Promise<void>

requestPasswordReset(email: string): Promise<void>
// When smtpEnabled=false: log the link at INFO level instead of emailing

confirmPasswordReset(token: string, newPassword: string): Promise<void>

setup2FA(accountId: string): Promise<{ secret: string, qrCodeDataUri: string, backupCodes: string[] }>
verify2FA(accountId: string, code: string): Promise<void>
disable2FA(accountId: string, password: string): Promise<void>

getMe(userId: string): Promise<MeDto>
// MeDto = { userId, personId?, email, displayName, roles, source, twoFactorEnabled, requires2FASetup }

// Internal — used by strategies
validateLocalCredentials(email: string, password: string): Promise<LocalAccount | null>
validateAndIssueFromExternalProvider(claims: ExternalProviderClaims): Promise<LoginResult>
```

### auth.controller.ts — endpoints

All under `@Controller('auth')` with global API prefix (`/api/auth/...`):

```
POST /auth/login                — body: { email, password } → { accessToken } + Set-Cookie: refresh_token
POST /auth/logout               — clears refresh cookie, revokes token in DB
POST /auth/refresh              — reads HttpOnly cookie → new { accessToken } + rotated cookie
POST /auth/password-reset/request  — body: { email }
POST /auth/password-reset/confirm  — body: { token, newPassword }
POST /auth/2fa/setup            — authenticated — returns { qrCodeDataUri, backupCodes }
POST /auth/2fa/verify           — authenticated — body: { code } — activates 2FA
POST /auth/2fa/disable          — authenticated — body: { password }
POST /auth/2fa/login            — body: { tempToken, code } — completes 2FA login → { accessToken } + cookie
GET  /auth/me                   — authenticated — returns MeDto
GET  /auth/providers            — public — returns { local: bool, ldap: bool, azureAd: bool }
```

**None of these endpoints use `@RequireRoles()` — they are auth endpoints and must bypass the RBAC guard. Decorate the controller class with `@Public()` (create a decorator) OR use `@SkipAuth()` to tell `RbacGuard` to allow them through.**

The cleanest approach: add a `@Public()` decorator that sets metadata, and check for it in `RbacGuard.canActivate()` before the role check:

```typescript
// In rbac.guard.ts — add this at the top of canActivate():
const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
  context.getHandler(), context.getClass(),
]);
if (isPublic) return true;
```

### Token implementation

- Access token: use existing `signPlatformJwt` from `src/modules/identity-access/application/platform-jwt.ts` — it already exists and produces tokens the existing `RbacGuard` understands. Pass `person_id` and `platform_roles` in the payload.
- Refresh token: random 32-byte hex string, stored as SHA-256 hash in `RefreshToken` table. Delivered as `HttpOnly; Secure; SameSite=Strict` cookie named `dc_refresh`.
- Temp 2FA token: short-lived (5 min) JWT with limited claim `{ sub: accountId, scope: '2fa_pending' }`, signed with `authJwtSecret`. Only accepted by `/auth/2fa/login`.

### LDAP strategy

```typescript
// Only registered conditionally:
// In auth.module.ts providers array:
// appConfig.authLdapEnabled ? LdapStrategy : []

// LdapStrategy uses PassportStrategy(LdapAuthStrategy)
// On success: call this.authService.validateAndIssueFromExternalProvider(ldapProfile)
// Map LDAP attributes to { userId: dn, email: mail, displayName: cn, roles: [] }
// Roles come from AUTH_LDAP_ROLE_MAP env var (JSON string)
```

### Azure AD strategy

```typescript
// Only registered conditionally: appConfig.authAzureAdEnabled ? AzureAdStrategy : []
// Uses openid-client with Entra discovery URL
// Discovery: https://login.microsoftonline.com/{tenantId}/v2.0/.well-known/openid-configuration
// On callback: extract claims, map AUTH_OIDC_ROLE_CLAIM → platform roles
// Auto-provision LocalAccount if first login (source='azure_ad')
```

### 2FA implementation

```typescript
// Setup:
import { authenticator } from 'otplib';
const secret = authenticator.generateSecret();
const otpauth = authenticator.keyuri(account.email, config.auth2faTotpIssuer, secret);
// Use qrcode.toDataURL(otpauth) → PNG data URI for frontend QR display

// Verify:
authenticator.verify({ token: code, secret: account.twoFactorSecret })

// Backup codes: generate 8 x random 8-char strings, store hashed (bcrypt), return plaintext once
```

---

## Step 5 — Backend: Register AuthModule in app.module.ts

```typescript
// In app.module.ts imports array, add:
import { AuthModule } from './modules/auth/auth.module';
// Add AuthModule to the imports array after IdentityAccessModule
```

`AuthModule` should import `PrismaModule` (already global) and `AppConfigModule` (already global). It does NOT need to export anything — it self-registers its controller.

---

## Step 6 — Backend: Update seed.ts

At the end of `clearExistingData()`, add:
```typescript
await prisma.passwordResetToken.deleteMany();
await prisma.refreshToken.deleteMany();
await prisma.localAccount.deleteMany();
```

At the end of `main()`, after all dataset seeding, add:

```typescript
await seedSuperadmin();
```

New function:
```typescript
async function seedSuperadmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@deliverycentral.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'DeliveryCentral@Admin1';
  const displayName = process.env.SEED_ADMIN_DISPLAY_NAME ?? 'System Administrator';

  const existing = await prisma.localAccount.findUnique({ where: { email } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Superadmin account already exists: ${email}`);
    return;
  }

  // Import bcrypt at top of file: import bcrypt from 'bcrypt';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.localAccount.create({
    data: {
      email,
      displayName,
      passwordHash,
      source: 'local',
      twoFactorEnabled: false,
      backupCodesHash: [],
      mustChangePw: false,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Superadmin seeded: ${email}`);
}
```

Note: The superadmin `LocalAccount` does NOT need a `personId` linkage — it is a system account, not a `Person` in the org model. The `roles` come from the JWT it is issued; the seed function does not store roles in the DB. Roles are hard-coded in the token payload when the admin logs in:

```typescript
// In auth.service.ts login(), for local accounts without a personId,
// derive roles from a separate lookup or config.
// For the superadmin specifically: check if email matches SEED_ADMIN_EMAIL
// and assign ['admin'] role. Or: store roles in a separate LocalAccountRole table.
```

**Simplest approach for the superadmin account:** add a `roles` field directly on `LocalAccount`:

```prisma
// Add to LocalAccount model in schema.prisma:
roles  String[]  @default([])
```

Then seed it with `roles: ['admin']` and issue tokens with those roles directly.

---

## Step 7 — Frontend: Update package.json and install

Already described in Step 1. After installing, verify `frontend/package.json` has all new deps.

---

## Step 8 — Frontend: MUI theme

Create `frontend/src/app/theme.ts`:

```typescript
import { createTheme } from '@mui/material/styles';

// Maps to existing CSS custom properties in global.css
export const appTheme = createTheme({
  palette: {
    primary: {
      main: '#114b7a',        // --color-accent
      light: '#dbe9f4',       // --color-accent-soft
    },
    error: {
      main: '#a63f3f',        // --color-danger
    },
    background: {
      default: '#f3f5f8',     // --color-bg
      paper: '#ffffff',       // --color-surface
    },
    text: {
      primary: '#1b2430',     // --color-text
      secondary: '#5d6b7d',   // --color-text-muted
    },
    divider: '#d7dde5',       // --color-border
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
  },
  shape: {
    borderRadius: 10,         // --radius-control
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,   // --radius-card
          boxShadow: '0 12px 30px rgba(17, 31, 51, 0.06)',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
});
```

Update `frontend/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';

import { App } from './app/App';
import { appTheme } from './app/theme';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
```

---

## Step 9 — Frontend: AuthContext

Create `frontend/src/app/auth-context.tsx`:

```typescript
// Types
export type AuthSource = 'local' | 'ldap' | 'azure_ad';

export interface AuthPrincipal {
  userId: string;
  personId?: string;
  email: string;
  displayName: string;
  roles: string[];      // PlatformRole values
  source: AuthSource;
  twoFactorEnabled: boolean;
  requires2FASetup: boolean;  // privileged role + 2FA not enrolled
}

export interface AuthContextValue {
  principal: AuthPrincipal | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginOutcome>;
  completeTwoFactor: (tempToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

export type LoginOutcome =
  | { status: 'success' }
  | { status: 'requires_2fa'; tempToken: string }
  | { status: 'error'; message: string };

// AuthProvider:
// - On mount: call GET /auth/me with stored token. If 401 → attempt refresh via POST /auth/refresh.
// - On login: POST /auth/login → store access token → call GET /auth/me
// - On logout: POST /auth/logout → clear token
// - Expose context via useAuth() hook

export const AuthContext = React.createContext<AuthContextValue>(/* ... */);
export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element { /* ... */ }
export function useAuth(): AuthContextValue { /* ... */ }
```

**Token storage:** access token in `localStorage` under key `deliverycentral.authToken` (matches existing `apiClientConfig.authTokenStorageKey`). Refresh token is HttpOnly cookie — browser handles it automatically.

**Update `frontend/src/lib/api/http-client.ts`:**

The file already reads the token from localStorage. Add a 401 interceptor:
- On 401: call `POST /auth/refresh` once
- If refresh succeeds: retry original request with new token
- If refresh fails: clear localStorage token, dispatch a custom event `'auth:session-expired'`
- `AuthProvider` listens for `'auth:session-expired'` and redirects to `/login`

---

## Step 10 — Frontend: Auth pages

### `/login` — `frontend/src/routes/auth/LoginPage.tsx`

Outside AppShell. Standalone centered layout.

Components to use: MUI `Card`, `TextField`, `Button`, `Alert`, `CircularProgress`, `Checkbox`, `FormControlLabel`.

Logic:
1. Call `GET /auth/providers` on mount → show only enabled provider buttons
2. Submit → `useAuth().login(email, password, rememberMe)`
3. If `requires_2fa` → show TOTP step (6-digit code input, same page, step 2)
4. On success → redirect to role dashboard (see routing logic below)
5. Error states: wrong credentials, account locked (show unlock time), 2FA invalid

### `/forgot-password` — `frontend/src/routes/auth/ForgotPasswordPage.tsx`

Single email field. Submit → `POST /auth/password-reset/request`. Always show neutral success message (no email enumeration). Link back to login.

### `/reset-password` — `frontend/src/routes/auth/ResetPasswordPage.tsx`

Reads `?token=` from URL. New password + confirm. Password strength bar (implement with simple regex checks — no extra library). On success: redirect to `/login` with success message.

### Role dashboard redirect helper

Create `frontend/src/app/role-routing.ts`:

```typescript
import type { PlatformRole } from '../lib/api/types';

const ROLE_PRIORITY: string[] = [
  'admin', 'director', 'hr_manager', 'resource_manager',
  'project_manager', 'delivery_manager', 'employee',
];

export function getDashboardPath(roles: string[]): string {
  const top = ROLE_PRIORITY.find((r) => roles.includes(r));
  switch (top) {
    case 'admin':            return '/admin';
    case 'director':         return '/';
    case 'hr_manager':       return '/dashboard/hr';
    case 'resource_manager': return '/dashboard/resource-manager';
    case 'project_manager':  return '/dashboard/project-manager';
    case 'delivery_manager': return '/dashboard/delivery-manager';
    default:                 return '/dashboard/employee';
  }
}
```

---

## Step 11 — Frontend: Protected routes + role guards

### `ProtectedRoute` component — `frontend/src/routes/ProtectedRoute.tsx`

```tsx
// Wraps a route. If not authenticated → redirect to /login (save current path).
// If authenticated but 2FA setup required → redirect to /auth/2fa-setup.
export function ProtectedRoute({ children }: { children: React.ReactNode }): JSX.Element
```

### `RoleGuard` component — `frontend/src/routes/RoleGuard.tsx`

```tsx
// Wraps a route. Renders children if principal has one of allowedRoles.
// Otherwise renders a 403 page inline (not a redirect).
export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}): JSX.Element
```

### Update `frontend/src/app/router.tsx`

- Add `/login`, `/forgot-password`, `/reset-password` as standalone routes (no AppShell wrapper).
- Wrap the existing AppShell route with `<ProtectedRoute>`.
- Wrap individual routes that need role restriction with `<RoleGuard allowedRoles={[...]}>`

**Full route permission matrix** (implement this exactly):

```typescript
// Route → allowedRoles mapping
// undefined means: all authenticated users

const ROUTE_ROLES: Record<string, string[] | undefined> = {
  '/':                            undefined,
  '/dashboard/planned-vs-actual': undefined,
  '/dashboard/employee':          ['employee', 'hr_manager', 'director', 'admin'],
  '/dashboard/project-manager':   ['project_manager', 'director', 'admin'],
  '/dashboard/resource-manager':  ['resource_manager', 'director', 'admin'],
  '/dashboard/hr':                ['hr_manager', 'director', 'admin'],
  '/dashboard/delivery-manager':  ['delivery_manager', 'director', 'admin'],
  '/org':                         undefined,
  '/people':                      undefined,
  '/teams':                       undefined,
  '/projects':                    undefined,
  '/assignments':                 undefined,
  '/work-evidence':               undefined,
  '/cases':                       undefined,
  '/exceptions':                  ['project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin'],
  '/admin/audit':                 ['hr_manager', 'director', 'admin'],
  '/admin/dictionaries':          ['hr_manager', 'director', 'admin'],
  '/admin/notifications':         ['director', 'admin'],
  '/admin/integrations':          ['director', 'admin'],
  '/admin/monitoring':            ['director', 'admin'],
  '/admin':                       ['admin'],
  '/integrations':                ['director', 'admin'],
  '/metadata-admin':              ['admin'],
};
```

---

## Step 12 — Frontend: Update navigation.ts

Replace `AppRouteDefinition` with:

```typescript
export interface AppRouteDefinition {
  description: string;
  group: 'dashboard' | 'people-org' | 'work' | 'governance' | 'admin';
  path: string;
  title: string;
  allowedRoles?: string[];  // undefined = all authenticated users
  icon?: string;            // MUI icon name (for future use)
}
```

Add `group` and `allowedRoles` to every route in `appRoutes`. Use the ROUTE_ROLES matrix above.

---

## Step 13 — Frontend: Update SidebarNav

`frontend/src/components/layout/SidebarNav.tsx` — import `useAuth`, filter routes:

```tsx
const { principal } = useAuth();
const visibleRoutes = routes.filter((route) => {
  if (!route.allowedRoles) return true;  // all authenticated users
  return route.allowedRoles.some((r) => principal?.roles.includes(r));
});
// Group visible routes by route.group for visual sections
```

Also add group section headers in the sidebar (`People & Org`, `Work`, `Governance`, `Admin`) using `<Divider>` and `<Typography>` from MUI.

---

## Step 14 — Frontend: Update TopHeader

`frontend/src/components/layout/TopHeader.tsx` — replace static content with:

```tsx
const { principal, logout } = useAuth();

// Show: displayName, role badge (top role), logout button
// Environment label driven by: import.meta.env.VITE_ENV_LABEL ?? 'Local Development'
// On logout: await logout() → navigate('/login')
```

---

## Step 15 — Frontend: Add /auth/2fa-setup page (if 2FA enforcement is on)

`frontend/src/routes/auth/TwoFactorSetupPage.tsx`

- Call `POST /auth/2fa/setup` → receive `{ qrCodeDataUri, backupCodes }`
- Display QR code as `<img src={qrCodeDataUri} />`
- User scans with Authenticator app
- Enter 6-digit code → `POST /auth/2fa/verify`
- Show backup codes (one-time display only) → checkbox "I saved my backup codes"
- Redirect to role dashboard on completion

---

## Step 16 — Verify the minimum viable flow

After all code is in place:

```bash
# 1. Start the stack
docker compose build
docker compose up -d postgres
docker compose run --rm migrate
docker compose --profile tools run --rm seed
docker compose up -d backend frontend

# 2. Open http://localhost:5173
# 3. Should land on /login (redirected by ProtectedRoute)
# 4. Enter: admin@deliverycentral.local / DeliveryCentral@Admin1
# 5. Should redirect to /admin (admin role → admin dashboard)
# 6. Verify sidebar shows all routes (admin sees everything)
# 7. Call GET http://localhost:3000/api/auth/providers → should return { local: true, ldap: false, azureAd: false }
# 8. Call GET http://localhost:3000/api/auth/me with Bearer token → should return superadmin claims
```

---

## Important files to read before editing

| File | Why |
|---|---|
| `src/modules/identity-access/application/platform-jwt.ts` | Re-use `signPlatformJwt` for access token minting — do not reinvent |
| `src/modules/identity-access/application/rbac.guard.ts` | Add `@Public()` check at top — do not replace the guard |
| `src/modules/identity-access/application/authenticated-principal.factory.ts` | Understand how existing bearer tokens are verified — new login flow produces compatible tokens |
| `src/shared/config/app-config.ts` | Extend, do not replace |
| `src/app.module.ts` | Add `AuthModule` to imports array only |
| `prisma/seed.ts` | Add `seedSuperadmin()` call and `clearExistingData()` cleanup only |
| `frontend/src/lib/api/http-client.ts` | Add 401 refresh interceptor — do not remove existing logic |
| `frontend/src/app/router.tsx` | Wrap routes — do not reorder or rename existing route paths |
| `frontend/src/app/navigation.ts` | Extend `AppRouteDefinition` interface, add `group` + `allowedRoles` |

---

## What comes AFTER Phase 1 (do not start this yet)

- Phase 2: MUI component migration (DataTable → DataGrid, OrgChart → React Flow, charts via Recharts)
- Phase 3: Self-scope enforcement (employees see only own data)
- Phase 4: Exception/reconciliation operator actions
- Phase 5: UX hardening (error boundaries, skeletons, form feedback)
- Phase 6: Read-model performance

Full plan is in `docs/planning/next-steps-roadmap.md` and in memory at `C:\Users\Asus\.claude\projects\c--VDISK1-DeliveryCentral\memory\project-plan.md`.
