# UX Contract — `LoginPage`

**Route:** `/login` ([`route-manifest.ts:108`](../../../frontend/src/app/route-manifest.ts#L108))
**Component:** [`LoginPage.tsx`](../../../frontend/src/routes/auth/LoginPage.tsx)
**Grammar:** Auth Form (Grammar 8) — MUI Card layout outside the auth boundary
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** public — accessible without authentication.
- **Acts as default destination** for unauthenticated users when the session expires (via `auth:session-expired` event).
- **Post-login redirect** = `location.state.from` if present, else `getDashboardPath(principal.roles)`.

## 2. Click paths

| Trigger | Destination |
|---|---|
| Credentials form submit | `POST /auth/login`; success → `POST /auth/me`; navigate (`replace: true`) |
| "Forgot password?" link | `/forgot-password` |
| 2FA TOTP form submit (post `requires_2fa`) | `POST /auth/2fa/login`; success → me + redirect |
| "Back" button (in 2FA step) | `setStep('credentials')` |

## 3. Form validation

| Field | Rule |
|---|---|
| Email | `type="email"`, `required` (HTML5) |
| Password | `type="password"`, `required` |
| TOTP code | `required`, `maxLength=6`, `inputMode="numeric"` |

Server rejection → MUI `<Alert severity="error">` with message.

## 4. Confirmation prompts

_None._

## 5. Toast / notification triggers

_None._ Errors render in `<Alert>`, not toasts.

## 6. Filters / sort / pagination / saved views

_None._

## 7. Empty / loading / error states

| State | Copy / Behavior |
|---|---|
| Submit loading | submit buttons show `<CircularProgress />` + "Signing in…" / "Verifying…" |
| Invalid credentials | server message in `<Alert>` |
| Network failure | "Unable to reach the server. Check your connection or try again later." |
| Generic auth error | "Login failed." |
| Providers loaded async | default `{ local: true, ldap: false, azureAd: false }` if fetch fails |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount | `GET /auth/providers` (provider visibility) |
| Submit | `POST /auth/login` body `{ email, password }`; response `{ accessToken }` or `{ requires2FA: true, tempToken }` |
| 2FA submit | `POST /auth/2fa/login` body `{ tempToken, code }` |
| Post-success | `POST /auth/me` (fetch principal) |
| Post-success | `localStorage.setItem(authTokenStorageKey, …)`; expiry warning scheduled from JWT exp claim |
| Post-success | `window.dispatchEvent('auth:login-success')` |

## 9. Other notable behaviors

- **Local form** rendered only when `providers.local === true`.
- **TOTP input** auto-focused when 2FA step is active.
- **Cross-tab logout** detected via `storage` event on `authTokenStorageKey`.
- **`auth:session-expired` listener** clears principal in current tab.
- **No persisted draft / no remember-me toggle** in current implementation.

---

## Mapped regression spec

[`e2e/ux-regression/LoginPage.spec.ts`](../../../e2e/ux-regression/LoginPage.spec.ts)
