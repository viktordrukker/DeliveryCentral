# MUI Audit Log

**Phase:** DS-7-5
**Last updated:** 2026-04-27
**Snapshot:** 22 files import from `@mui/*`. `@mui/x-data-grid` was already removed from `package.json` (DS-4-15). This document classifies each remaining usage as **keep**, **replace**, or **defer-to-grammar-migration**, with rationale.

## Allowlist policy

A MUI import is **allowed** if all four conditions hold:
1. The DS doesn't ship a same-cost replacement.
2. The MUI surface is contained (does not bleed Emotion-injected styles into raw color tokens).
3. The bundle weight is amortized across many call sites OR the surface is a single auth/admin page with no perf-critical concern.
4. The component carries an entry in this audit with a current keep/replace decision.

Unaudited MUI imports are NOT allowed in new code — DS-7-5 enforcement once this audit is complete.

## Audit table

| Category | File | MUI surface | Decision | Rationale |
|---|---|---|---|---|
| **Theme infrastructure** | [`src/app/theme.ts`](../../frontend/src/app/theme.ts) | `createTheme` | **KEEP** | MUI theme is the bridge to design tokens for the ~10 MUI surfaces below. Removing requires removing all MUI components first. Single audit entry covers all of MUI's theme plumbing. |
| | [`src/styles/design-tokens.ts`](../../frontend/src/styles/design-tokens.ts) | `createTheme`, `Theme` types | **KEEP** | Design-tokens module exports a MUI theme so the existing MUI consumers below pick up dark/light correctly. Same justification as `theme.ts`. |
| | [`src/components/ds/ThemeProvider.tsx`](../../frontend/src/components/ds/ThemeProvider.tsx) | `ThemeProvider`, `CssBaseline` | **KEEP** | The DS ThemeProvider wraps the MUI ThemeProvider so the MUI theme stays in sync with the DS preference. Removing requires removing all MUI components. |
| | [`src/main.tsx`](../../frontend/src/main.tsx) | wires up `ThemeProvider` | **KEEP** | Entry-point wiring; same justification as ThemeProvider. |
| **Auth shell (Grammar 8)** | [`src/routes/auth/LoginPage.tsx`](../../frontend/src/routes/auth/LoginPage.tsx) | `Box`, `Card`, `TextField`, `Button`, `Stack`, `Typography` | **KEEP** | Auth pages are intentionally MUI-based (Grammar 8 — `AuthShell`). Bundle weight is paid once for the 4 auth pages. Migrating to DS atoms would lose MUI's auth-page form ergonomics for marginal gain. |
| | [`src/routes/auth/ResetPasswordPage.tsx`](../../frontend/src/routes/auth/ResetPasswordPage.tsx) | same as Login | **KEEP** | Same justification. |
| | [`src/routes/auth/ForgotPasswordPage.tsx`](../../frontend/src/routes/auth/ForgotPasswordPage.tsx) | same as Login | **KEEP** | Same justification. |
| | [`src/routes/auth/TwoFactorSetupPage.tsx`](../../frontend/src/routes/auth/TwoFactorSetupPage.tsx) | same + `Alert` | **KEEP** | Same justification. |
| **Single-component shims** | [`src/components/common/StatusBadge.tsx`](../../frontend/src/components/common/StatusBadge.tsx) | `Chip` (only when `variant="chip"`) | **KEEP for now** | Single MUI surface inside the most-used DS atom. Replacing requires a DS Chip atom — defer until a real need surfaces. ~50 callsites use `<StatusBadge variant="chip">`. |
| | [`src/components/common/EmptyState.tsx`](../../frontend/src/components/common/EmptyState.tsx) | `Box`, `Typography`, icon | **REPLACE** | Token-driven equivalent is straightforward; current EmptyState is one of the most-used common components. Migration scheduled for the DS-5 layouts sweep — bundles up with grammar-conformance work. |
| | [`src/components/common/ErrorState.tsx`](../../frontend/src/components/common/ErrorState.tsx) | `Box`, `Button`, `Typography`, icon | **REPLACE** | Same as EmptyState. |
| | [`src/components/common/LoadingState.tsx`](../../frontend/src/components/common/LoadingState.tsx) | `Skeleton`, `Box` | **DEFER** | DS Skeleton atom exists but the variant-rich behavior here (skeleton type per page grammar) needs a separate small refactor. Schedule with DS-5 layouts. |
| | [`src/components/common/InlineConfirm.tsx`](../../frontend/src/components/common/InlineConfirm.tsx) | `Box`, `Button`, `Typography` | **REPLACE** | Single inline-confirm pattern. Could use DS Button + a small custom container. Low priority — only ~3 callers. |
| | [`src/components/common/NextAction.tsx`](../../frontend/src/components/common/NextAction.tsx) | `Box`, `Button`, `Typography`, icon | **REPLACE** | Same as InlineConfirm — small surface, easily ported when next touched. |
| **Dashboard atoms** | [`src/components/dashboard/StatCard.tsx`](../../frontend/src/components/dashboard/StatCard.tsx) | `Card`, `CardActionArea`, `Skeleton`, `Typography`, `Box` | **REPLACE** | The most-MUI-heavy file in the audit. Should migrate to a DS `<Card>` + `<Skeleton>` composition. **Blocker**: requires a DS `Card` atom (not yet built). Schedule with DS-5 dashboard layout. |
| | [`src/components/dashboard/AnomalyStrip.tsx`](../../frontend/src/components/dashboard/AnomalyStrip.tsx) | `Chip`, `Box`, `Typography` | **REPLACE** | Same Chip dependency as StatusBadge — defer until Chip atom exists. |
| | ~~[`src/components/dashboard/DataFreshness.tsx`](../../frontend/src/components/dashboard/DataFreshness.tsx)~~ | ~~`Box`, `Typography`, `Button`~~ | ✅ replaced 2026-04-27 | The original MUI-based file was an orphan (zero callers). Replaced with a token-driven DS-style component ([`DataFreshness.tsx`](../../frontend/src/components/dashboard/DataFreshness.tsx)) using `<Button variant="link">`. Now consumed via `<DashboardLayout freshness={…}>`. |
| | [`src/components/dashboard/WhatNeedsYouNow.tsx`](../../frontend/src/components/dashboard/WhatNeedsYouNow.tsx) | `Box`, `Card`, `Typography` | **REPLACE** | Same Card dependency as StatCard. |
| **Layout primitives** | [`src/components/layout/MasterDetailLayout.tsx`](../../frontend/src/components/layout/MasterDetailLayout.tsx) | `Box`, `Drawer` | **DEFER** | The component has zero callers (DS-4-15 inventory confirmed) — could be deleted entirely or rebuilt on DS Drawer. Awaiting DS-5 list-detail grammar work. |
| | [`src/components/layout/TopHeader.tsx`](../../frontend/src/components/layout/TopHeader.tsx) | `Box`, `IconButton`, `Avatar` | **DEFER** | Top nav header. Migration is bundled with the AppShell mobile-collapse work (DS-5-2). |
| | [`src/components/layout/InspectorPanel.tsx`](../../frontend/src/components/layout/InspectorPanel.tsx) | `Box`, `Drawer`, `Typography` | **DEFER** | Same family as MasterDetailLayout. |
| **Routing wrapper** | [`src/routes/ProtectedRoute.tsx`](../../frontend/src/routes/ProtectedRoute.tsx) | `Box`, `CircularProgress` | **REPLACE** | `CircularProgress` should become DS `<Spinner>`. Trivial port. |

## Summary by decision

| Decision | Count |
|---|---|
| **KEEP** (allowed) | 9 |
| **REPLACE** (sweep) | 8 (was 9 — DataFreshness shipped) |
| **DEFER** (gated on other work) | 4 |

## Sweep order

When migrating REPLACE items:
1. ProtectedRoute.tsx — single-line port to DS Spinner. Quick win.
2. EmptyState / ErrorState — high call-site count, big "fix-once" leverage.
3. InlineConfirm / NextAction — small files, easy ports.
4. DataFreshness — bundle with DS-5 dashboard layout work.
5. StatCard / WhatNeedsYouNow — gated on building a DS Card atom (DS-5 dashboard layout).
6. AnomalyStrip — gated on DS Chip atom.
7. StatusBadge `Chip` extraction — gated on DS Chip atom.

**Bundle impact estimate**: Removing all REPLACE-tier MUI usage drops `~150KB` from the bundle (MUI Material partial tree-shake). Auth shell + theme infrastructure + StatusBadge Chip will keep MUI in the dependency tree until a DS Chip atom and DS auth shell ship.

## Enforcement

DS-7-5 (this doc) is the **authoritative allowlist**. New code introducing a MUI import in a non-audited file should fail review. A future ESLint rule could enforce this against an explicit `mui-allowed-files.json` baseline; for now this doc is the source of truth.
