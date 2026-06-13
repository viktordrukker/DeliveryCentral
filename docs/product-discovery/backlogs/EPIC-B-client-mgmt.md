# EPIC B — Client Management UI (decomposition + delivery record)

**Status:** ✅ implemented + verified (depth-first). Priority P0, effort S.
**Branch:** `feat/epic-b-client-mgmt`. **Analysis:** `../E6-client-mgmt.md`.

## Job-to-be-done
> When I create a delivery project, I need to pick the **client** (customer) it's for — and **add a new client** if it isn't in the system yet — without leaving the flow or asking an admin to hand-seed the database.

The backend (model `Client`, `client.controller`, `client.service`, FE API `clients.ts`) was already built; the only gap was the **UI**, so the Create-Project "Client" dropdown could only list seeded clients. This epic closes that gap.

## Personas
- **Admin** — owns master data; manages the client registry from Admin → Dictionaries.
- **Project Manager** — creates projects; needs clients to exist (and to add one inline — Phase 2).

## User stories
1. As an admin/PM, I can **view all clients** (active + inactive) with industry, account-manager **name**, and project count.
2. As an admin/PM, I can **add a client** (name required; optional industry, account manager via people picker, notes).
3. As an admin, I can **deactivate / reactivate** a client.
4. *(System)* Client create/update **records the acting user** (`createdByPersonId` / `updatedByPersonId`) — closes a D-103-write-path hole.

## Atomic items
| # | Item | Status |
|---|------|--------|
| B1 | `ClientRegistryAdminContent` + `ClientRegistryPage` (list + inline create form + activate/deactivate; account manager via `PersonSelect`) | ✅ |
| B2 | Mount `ClientRegistryAdminContent` in Admin → **Dictionaries** tab (V2-reachable) | ✅ |
| B3 | `/admin/clients` route (route-manifest + router, `ADMIN_ROLES`) | ✅ |
| B4 | Thread `@Req` principal → `clientService.create/update(actorId)` in `client.controller` | ✅ |
| B5 | `ClientRegistryPage.test.tsx` — list / empty / create / toggle (4 tests) | ✅ |
| B6 | *(Phase 2, deferred)* inline "+ New client" in the Create-Project form | ⏳ |

## Acceptance criteria (all met)
- Registry lists clients; created client persists and appears immediately; toggle persists.
- Account manager renders the person **name**, never a UUID (uses `accountManagerDisplayName` + `PersonSelect`).
- `createdByPersonId` / `updatedByPersonId` populate on write.
- `tsc` (FE + BE) clean; `ClientRegistryPage.test.tsx` 4/4 green; AdminPanelPage suite 25/25 still green.

## Inventory validation
Cross-referenced against `docs/qa/action-inventory.json` (branch `qa/v2-full-surface-2026-06-13`): the client-management surface was previously **absent** from the reachable action inventory (no `/admin/clients`, `createClient` called nowhere). This epic adds it as a reachable, RBAC-guarded action. Coverage ledger entry: **clients.create / clients.update / clients.list → now wired to UI.**
