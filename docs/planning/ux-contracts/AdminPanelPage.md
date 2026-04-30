# UX Contract — `AdminPanelPage`

**Route:** `/admin` ([`route-manifest.ts:165`](../../../frontend/src/app/route-manifest.ts#L165))
**Component:** [`AdminPanelPage.tsx`](../../../frontend/src/routes/admin/AdminPanelPage.tsx)
**Grammar:** Admin Control Surface (Grammar 7)
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `ADMIN_ROLES` = `admin` only.

## 2. Click paths

| Trigger | Behavior |
|---|---|
| Sidebar section button | `setSelectedSection(...)` (Accounts / Dictionaries / Integrations / Notifications / Settings) |
| Account "Disable" | `PATCH /admin/accounts/:id` `{ isEnabled }` |
| Account "View as" | `startImpersonation(...)` (only when account has `personId`) |
| Account "Delete" | opens `<ConfirmDialog>` |
| Confirm delete | `DELETE /admin/accounts/:id` |
| Cancel delete | close dialog |
| Create account form submit | `POST /admin/accounts` |
| "Manage dictionary entries" | `/admin/dictionaries` |
| "Manage integrations" | `/admin/integrations` |
| "Manage notification templates" | `/admin/notifications` |
| "Open monitoring view" | `/admin/monitoring` |
| "Browse business audit" | `/admin/audit` |

## 3. Form validation

| Field | Rule |
|---|---|
| Person ID | required, type=text |
| Email | required, type=email |
| Password | required, type=password ("Minimum 8 characters" placeholder) |
| Roles | required, comma-separated text |

## 4. Confirmation prompts

| Action | Message | Confirm label |
|---|---|---|
| Delete account | `Delete account {email}? This cannot be undone.` | "Delete account" |

## 5. Toast / notification triggers

_None._ Success/error rendered as success-banner and `<ErrorState>`.

## 6. Filters / sort / pagination / saved views

- `selectedSection` local state, default `'accounts'`. No URL persistence. No pagination.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Page loading | skeleton page |
| Page error | dynamic |
| No data (totalItemCount === 0) | "Admin aggregation endpoints returned no data for dictionaries, integrations, notifications, or system settings." |
| Account list loading | LoadingState |
| Account list error | ErrorState |
| Account action error | ErrorState |
| No accounts | EmptyState |
| Create account error | ErrorState |
| Create account success banner | "Account created: {email} ({id})" |
| Dictionaries empty | "No dictionary summary is available." |
| Dictionaries list empty | "No dictionaries were returned." |
| Integrations empty | "No integrations are configured." |
| Integrations list empty | "No integration details were returned." |
| Notifications channels empty | "No notification channels are enabled." |
| Notifications templates empty | "No notification templates are configured." |
| Settings empty | "No system settings were returned." |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount (parallel via `Promise.all`) | `GET /admin/config`, `GET /admin/settings`, `GET /admin/integrations`, `GET /admin/notifications` |
| Account section focus | `GET /admin/accounts` |
| Create account | `POST /admin/accounts` `{ email, password, personId, roles }` |
| Toggle account | `PATCH /admin/accounts/:id` `{ isEnabled }` |
| Delete account | `DELETE /admin/accounts/:id` |
| After CUD | `loadAccounts()` to refresh |

## 9. Other notable behaviors

- **Concurrent fetch error:** any one endpoint failure surfaces a generic page error state.
- **"View as"** only rendered for accounts with `personId`.
- **Inline-action button styling** uses fontSize 12px, padding 2px 8px (legacy ad-hoc, may change in DS-1).
- **Account status colors:** active = `--color-status-active`; disabled = `--color-status-danger`.

---

## Mapped regression spec

[`e2e/ux-regression/AdminPanelPage.spec.ts`](../../../e2e/ux-regression/AdminPanelPage.spec.ts)
