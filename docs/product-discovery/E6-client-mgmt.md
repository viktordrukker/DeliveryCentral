---
area: "Client management UI"
effort: S
---

# Client management UI

**Effort:** S

## Current state

Backend is FULLY BUILT. Frontend API client is FULLY BUILT. UI is ABSENT.

Backend (fully-built):
- Prisma model `Client` at prisma/schema.prisma:2671-2700 — fields: id, publicId, name (unique), industry, accountManagerPersonId, notes, isActive, createdAt/updatedAt, actor-audit (createdByPersonId/updatedByPersonId), relations to Person (accountManager), Project[], RateCard[], Tenant. Indexed on isActive, tenantId, accountManagerPersonId.
- `ClientController` at src/modules/project-registry/presentation/client.controller.ts — GET /api/clients (list, ?activeOnly), GET /api/clients/:id, POST /api/clients, PATCH /api/clients/:id. Read endpoints gated `@RequireRoles(...STAFFING_ROLES)`; write endpoints gated `@RequireRoles('admin','project_manager')`.
- `ClientService` at src/modules/project-registry/application/client.service.ts — list/getById/create/update; create+update already accept an optional `actorId` param to populate the audit columns, but the controller never passes it (controller calls `clientService.create(dto)` / `update(id, dto)` with no actor — a small write-path gap mirroring D-103-write-path).
- DTO returns projectCount via Prisma `_count.projects` and accountManagerDisplayName via the relation — exactly the list/detail fields the UI needs.

Frontend API (fully-built, but createClient/updateClient are dead code):
- frontend/src/lib/api/clients.ts exports `ClientDto`, `fetchClients(activeOnly)`, `fetchClientById(id)`, `createClient(data)`, `updateClient(id,data)`. Grep across frontend/src confirms `createClient`/`updateClient` are imported NOWHERE; only `fetchClients` is consumed.
- Consumers of fetchClients: frontend/src/components/common/ClientSelect.tsx (token-driven picker used on RateCardsAdminPage) and frontend/src/features/projects/useProjectLifecycleAdmin.ts:70 (builds clientOptions for the project-create wizard). The Create-Project client dropdown (ProjectLifecycleForm.tsx:115-117, 'Select client (optional)') therefore only ever lists seeded clients — no way to add one inline.

UI / routing (absent):
- No clients route exists. Grep of frontend/src/app/route-manifest.ts and router.tsx for clients/ClientRegistry/ClientsAdmin/'/admin/clients' returns nothing. No page component exists under frontend/src/routes.

Seed data: 9 clients seeded (prisma/seeds/it-company-profile.ts:708-718: Acme Industries, Bluebird Logistics, Cascade Insurance, Delta Analytics, Echo Retail, Forestry Co., Gamma SaaS, Helios Bank, Jade Manufacturing), each with name+industry+notes, isActive=true, accountManagerPersonId=null. 9 of 10 active projects map to a client (prisma/seeds/it-company-profile.ts:720-733; Internal stays null).

Direct analog already in production: frontend/src/routes/admin/VendorRegistryPage.tsx is a near-identical registry surface (list + inline create form + activate/deactivate toggle), registered at router.tsx:544 `path: 'admin/vendors'` under `ADMIN_ROLES`, manifest entry route-manifest.ts:366 group 'admin-config' (note: marked obsoleteInV2:true). It is the copy-paste template for the Clients page.

## Gaps

- No clients admin route or page exists — createClient/updateClient in frontend/src/lib/api/clients.ts are dead exports
- Create-Project client dropdown (ProjectLifecycleForm.tsx:115) cannot add a new client inline; an operator onboarding a net-new client must abandon the wizard, and today has no other path to create one at all
- accountManagerPersonId is never settable from any UI (seed sets it null; no create/edit surface), so the account-manager relation and its index are unused in practice
- Client write endpoints do not thread actorId — controller calls service.create(dto)/update(id,dto) without the optional actorId, so createdByPersonId/updatedByPersonId stay null (mirrors known D-103-write-path gap)
- No deactivate/reactivate affordance for clients despite isActive field + index existing
- No client detail surface to show the client's projects (projectCount is computed but only exposed as a number)
- RateCardsAdminPage depends on ClientSelect which lists only active clients — with no way to create a client, rate-card setup for a new client is blocked

## Product definition

Job-to-be-done: "When my delivery org signs a new client (or needs to correct client master data), I want to register and maintain that client in one place, so projects, rate cards, and account-manager ownership attach to a real client record instead of being blocked or mis-attributed."

Personas:
- Admin (primary) — owns master data / org config; expects a `/admin/*` registry like Vendors and Rate Cards.
- Project Manager (secondary) — at project-creation time hits the wall of "client not in the list"; write endpoints already grant PM the create/update role, so PM is an intended actor.
- Director / RM / DM (read-only) — STAFFING_ROLES can list/view clients for portfolio context.

User value: unblocks net-new client onboarding end-to-end (client → rate card → project), gives a single source of truth for client master data, lets the org assign an account manager (CRM-lite ownership), and supports deactivating churned clients without losing history. For the CIS/Uzbekistan bank target (agentic.uz), a clean client registry is table-stakes master-data hygiene.

Minimal viable scope (tightly scoped quick win):
1. New page `ClientRegistryPage` at `/admin/clients` — List-Detail Workflow grammar, but realized as the lightweight registry pattern already proven by VendorRegistryPage (PageContainer + PageHeader + inline create SectionCard + DataView list + activate/deactivate toggle). Columns: Name, Industry, Account Manager, Projects (projectCount, right-aligned), Status (StatusBadge dot). Create form fields: name (required), industry, accountManager (PersonSelect), notes. Row action: Deactivate/Activate via updateClient({isActive}).
2. Inline "+ New client" in the project-create wizard — a small button next to the client dropdown in ProjectLifecycleForm that opens the same create flow (modal or inline), then auto-selects the new client. This is the highest-leverage UX win (kills the dead-end), and can ship in the same effort if the create form is extracted into a reusable component.

Page grammar: maps to Grammar 7 (Admin Control Surface) for the `/admin/clients` registry per docs/planning/phase18-page-grammars.md — consistent with Vendor Registry and Rate Cards which live in the same admin-config group. The detail view (client + its projects) is Grammar 2/3 (List-Detail / Detail Surface) if/when added in Phase 2.

## Recommendation

Ship in two phases, both small.

Phase 1 (the quick win — recommended to do now): Build `ClientRegistryPage` by cloning VendorRegistryPage.tsx. This is the lowest-risk path because the BE, FE API, DataView, SectionCard, StatusBadge, PageHeader, and the exact list+inline-create+toggle interaction are all already proven in the vendor page. Add the route to router.tsx (path 'admin/clients', RoleGuard ADMIN_ROLES — or widen to admin+project_manager to match the BE write grant) and one manifest entry in route-manifest.ts (group 'admin-config', do NOT set obsoleteInV2). Use PersonSelect for the account-manager field so accountManagerPersonId becomes settable. Write ClientRegistryPage.test.tsx mocking '@/lib/api/clients'. Also fix the controller actorId gap (thread the principal into clientService.create/update) so audit columns populate — it is two lines and closes a known write-path hole.

Phase 2 (fast follow): Extract the create form into a `<ClientCreateForm>` and add an inline "+ New client" affordance beside the client dropdown in ProjectLifecycleForm.tsx, auto-selecting the created client. This eliminates the project-wizard dead-end (UX Law 2) and removes duplicated input (UX Law 6).

Recommended option over alternatives: a dedicated registry page (Option A) first, then inline-add (Option B) as the fast follow — rather than inline-only — because the registry also serves edit/deactivate/account-manager assignment that an inline modal cannot, and it matches the established admin-config pattern users already know from Vendors.

## Dependencies

- frontend/src/lib/api/clients.ts (already exports fetchClients/createClient/updateClient — no change needed)
- frontend/src/routes/admin/VendorRegistryPage.tsx (clone template)
- frontend/src/components/common/PersonSelect.tsx (account-manager picker)
- frontend/src/components/ds (Button, DataView, Column) + common (PageContainer, PageHeader, SectionCard, StatusBadge, EmptyState, ErrorState, LoadingState)
- frontend/src/app/router.tsx + frontend/src/app/route-manifest.ts (route + nav registration; ADMIN_ROLES or admin+project_manager guard)
- src/modules/project-registry/presentation/client.controller.ts (optional 2-line actorId threading fix)
- ClientSelect.tsx + ProjectLifecycleForm.tsx + useProjectLifecycleAdmin.ts (Phase 2 inline-add integration)

## Risks

- RBAC mismatch: BE write endpoints allow admin+project_manager, but if the FE route is gated ADMIN_ROLES (admin only) PMs get a 403 surprise, or vice-versa — pick one consistently. Recommend matching the BE (admin+project_manager) and reflect it in route-manifest allowedRoles.
- obsoleteInV2 flag: VendorRegistry is marked obsoleteInV2:true; if the new clients route is added without thought it could inherit the wrong V2 disposition. Per memory the V2/dsRefresh cutover is gated and not yet flipped — confirm whether a new admin page should be V2-native or carry obsoleteInV2.
- Name uniqueness: Client.name is @unique — the create form must surface the 'name already exists' server error gracefully (Vendor template does not handle the unique-violation path specifically).
- publicId: model has a nullable publicId VARCHAR(32) (no-UUIDs-in-browser rule per memory feedback-no-uuids-in-browser). DTO currently returns raw uuid id; new page must not leak raw UUIDs into URLs — keep id internal, no client-id-in-URL detail route until publicId is populated.
- Tenant scoping: Client has tenantId; create path must set/inherit tenant correctly (verify service applies tenant context) or rows could be created tenant-less.
- Deactivate is soft (isActive=false) but clients with active projects should arguably warn before deactivation — projectCount is available, so a ConfirmDialog message can include it; skipping that is a minor UX gap, not a blocker.

## Claude Design prompt

```
Design an admin "Client Registry" page for a bank-grade delivery/resource-management web app (dark-capable design system, token-driven). It mirrors an existing Vendor Registry. Layout top-to-bottom: (1) PageHeader with eyebrow "Admin", title "Client Registry", subtitle "Manage clients and account-manager ownership for projects and rate cards", and a primary "Add Client" button top-right. (2) An inline collapsible "New Client" form card that appears when Add Client is clicked: fields Name (required text), Industry (text), Account Manager (person picker dropdown), Notes (textarea), with Create + Cancel buttons. (3) A compact data table of clients with columns: Name (medium weight), Industry, Account Manager, Projects (right-aligned count), Status (green dot = active / grey = inactive), and a right-most row action button "Deactivate"/"Activate". Use a clear EmptyState ("No clients yet" with an Add Client action) and skeleton loading. Keep it consistent with an enterprise admin surface — calm, dense, status-badge driven, no marketing styling. Provide light and dark variants using neutral surfaces, a single accent color for primary actions, green/amber/grey status tones, and tabular-aligned numeric columns.
```

---

# Client Management UI — Product Discovery & BA Analysis

## 1. Current state (code-grounded)

| Layer | Status | Evidence |
|---|---|---|
| Prisma model `Client` | fully-built | `prisma/schema.prisma:2671-2700` — name(unique), industry, accountManagerPersonId, notes, isActive, actor-audit cols, relations to Person/Project/RateCard/Tenant |
| REST API | fully-built | `src/modules/project-registry/presentation/client.controller.ts` — GET `/api/clients`, GET `/api/clients/:id`, POST `/api/clients`, PATCH `/api/clients/:id` |
| Service | fully-built (minor gap) | `src/modules/project-registry/application/client.service.ts` — list/getById/create/update; create+update accept optional `actorId` but the controller never passes it |
| FE API client | fully-built, partly dead | `frontend/src/lib/api/clients.ts` — `fetchClients`, `fetchClientById`, `createClient`, `updateClient`. **`createClient`/`updateClient` imported nowhere** |
| FE consumers of clients | partial | `ClientSelect.tsx` (read-only picker), `useProjectLifecycleAdmin.ts:70` (project-wizard dropdown) — both list-only |
| Clients route / page | **absent** | No match for clients/ClientRegistry/`/admin/clients` in `route-manifest.ts` or `router.tsx`; no `routes/**` component |
| Seed data | fully-built | `prisma/seeds/it-company-profile.ts:708-718` — 9 clients (Acme … Jade); `:720-733` maps 9/10 active projects to a client |

**RBAC (from controller):** read = `@RequireRoles(...STAFFING_ROLES)`; write (POST/PATCH) = `@RequireRoles('admin','project_manager')`.

**The exact analog already in prod:** `frontend/src/routes/admin/VendorRegistryPage.tsx` is a list + inline-create + activate/deactivate registry, registered at `router.tsx:544` (`path: 'admin/vendors'`, `ADMIN_ROLES`) with manifest entry `route-manifest.ts:366` (group `admin-config`, `obsoleteInV2:true`). The Clients page is essentially a field-swap clone of this file.

## 2. Gaps

1. **No clients UI at all** — `createClient`/`updateClient` are dead exports.
2. **Project-create dead-end** — `ProjectLifecycleForm.tsx:115` client dropdown ("Select client (optional)") only lists seeded clients; an operator with a net-new client cannot create one (UX Law 2 violation), and has no other path either.
3. **Account-manager never settable** — seed sets `accountManagerPersonId: null`; no UI writes it, so the relation + index are dormant.
4. **Actor-audit write-path gap** — controller calls `service.create(dto)`/`update(id,dto)` without `actorId`, so `createdByPersonId`/`updatedByPersonId` stay null (same shape as known D-103-write-path).
5. **No deactivate/reactivate** despite `isActive` + index.
6. **No client detail surface** — `projectCount` computed but only a number; can't see the client's projects.
7. **Rate-card setup blocked for new clients** — `RateCardsAdminPage` uses `ClientSelect` (active clients only); with no create path, a new client's rate card can't be configured.

## 3. Product definition

**JTBD:** *"When my org signs a new client or needs to fix client master data, register/maintain that client in one place so projects, rate cards, and account-manager ownership attach to a real record instead of being blocked or mis-attributed."*

**Personas:** Admin (primary, owns master data), Project Manager (secondary — already a BE-authorized writer, hits the wizard wall), Director/RM/DM (read-only via STAFFING_ROLES).

**User value:** unblocks client→rate-card→project onboarding end-to-end; single source of truth for client master data; account-manager (CRM-lite) ownership; clean deactivation of churned clients. Master-data hygiene is table-stakes for the CIS/Uzbekistan bank target (agentic.uz).

**Minimal viable scope:**
- `ClientRegistryPage` at `/admin/clients` (Admin Control Surface, **Grammar 7**, matching Vendors/Rate Cards), realized via the proven VendorRegistry list + inline-create + toggle pattern. Columns: Name, Industry, Account Manager, Projects (right), Status (dot). Create fields: name (req), industry, account manager (PersonSelect), notes. Row action: Deactivate/Activate.
- Inline **"+ New client"** beside the wizard dropdown (Phase 2) → auto-select created client.

## 4. Options & trade-offs

| Option | Pros | Cons |
|---|---|---|
| **A. Dedicated `/admin/clients` registry** (recommended first) | Reuses proven pattern; supports edit/deactivate/account-manager; matches admin mental model | Doesn't by itself fix the wizard dead-end |
| **B. Inline "+ New client" only** | Fixes the most painful flow directly | No edit/deactivate/list/account-manager; modal can't carry master-data mgmt |
| **C. Both, A then B** (recommended) | Full coverage; B reuses A's extracted form | Slightly more work than A alone (still S) |

**Recommendation: C — A first, B as fast-follow.**

## 5. Phased action list

**Phase 1 — Clients registry (do now):**
1. Create `frontend/src/routes/admin/ClientRegistryPage.tsx` by cloning `VendorRegistryPage.tsx`; swap fields to name/industry/accountManager(PersonSelect)/notes; wire `fetchClients(false)` / `createClient` / `updateClient({isActive})`. → verify: page renders list of 9 seeded clients.
2. Register route in `router.tsx` (`path: 'admin/clients'`, `RoleGuard` = admin+project_manager to match BE) and add a manifest entry in `route-manifest.ts` (group `admin-config`, **no** `obsoleteInV2`). → verify: nav link visible; `npm --prefix frontend run test` route-manifest test passes.
3. Add `ClientRegistryPage.test.tsx` mocking `@/lib/api/clients`. → verify: test file passes.
4. Thread principal into `client.controller.ts` create/update (`service.create(dto, principal.personId)`). → verify: `tsc --noEmit` clean; created client has non-null `createdByPersonId`.

**Phase 2 — Inline add in wizard (fast follow):**
5. Extract `<ClientCreateForm>` from the registry create card.
6. Add "+ New client" next to the dropdown in `ProjectLifecycleForm.tsx`; on success refresh `clientOptions` (`useProjectLifecycleAdmin`) and auto-select. → verify: creating from the wizard selects the new client without leaving the page (UX Laws 2 & 6).

## 6. Effort / dependencies / risks

**Effort: S** (Phase 1 is a field-swap clone of an existing page; Phase 2 a small extraction + one button).

**Dependencies:** `clients.ts` API (ready), `VendorRegistryPage.tsx` (template), `PersonSelect`, ds/common primitives, `router.tsx`+`route-manifest.ts`, optional controller 2-liner; Phase 2 touches `ProjectLifecycleForm`/`useProjectLifecycleAdmin`.

**Risks:**
- RBAC mismatch — align FE guard with BE write grant (admin+project_manager).
- `obsoleteInV2` — Vendor template carries it; decide V2-native vs obsolete (V2 cutover gated/unflipped per memory).
- `Client.name @unique` — handle server unique-violation gracefully in the create form.
- No-UUIDs-in-browser rule — keep `id` internal; don't add a UUID-in-URL detail route until `publicId` is populated.
- Tenant scoping — ensure create sets/inherits `tenantId`.
- Deactivating a client with active projects — use `ConfirmDialog` showing `projectCount`.
