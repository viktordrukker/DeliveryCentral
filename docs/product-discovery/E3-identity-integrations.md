---
area: "Identity & mail integrations (M365 / AzureAD hybrid, Exchange, Kerberos / SSO / OAuth 2.0)"
effort: XL
---

# Identity & mail integrations (M365 / AzureAD hybrid, Exchange, Kerberos / SSO / OAuth 2.0)

**Effort:** XL

## Current state

SHIPPED / fully-built:
- OIDC / OAuth 2.0 Authorization-Code + PKCE login (D-155). `src/modules/auth/oidc.service.ts` uses `openid-client@6` with discovery, PKCE (S256), state, ID-token email-claim → `LocalAccount.upsert`. Endpoints `GET /api/auth/oidc/login` + `/callback` in `src/modules/auth/oidc.controller.ts` (Public + SkipDemoGuard, throttled, httpOnly signed state cookie, open-redirect-guarded). Feature-flagged `flag.feature.integrations.oidc.enabled` (default OFF — `frontend/src/lib/feature-flags.ts:173`, `src/shared/config/platform-flags.service.ts:684`). IdP-agnostic (Entra/Okta/Keycloak/Ping/Google).
- Self-serve SSO admin (NEW-LGL-2): `src/modules/auth/sso-admin.service.ts` + `sso-admin.controller.ts` (`GET/PUT /api/admin/sso/config`, `POST /api/admin/sso/test`, admin-only). Client secret AES-256-GCM encrypted at rest (key derived from authJwtSecret), masked on GET. UI at `frontend/src/routes/admin/SsoAdminPage.tsx` with provider presets (Google/Azure AD/Okta/generic OIDC), Test-connection button. Mirrors `sso.*`→`sso.idp.*` keys so live handler picks up config without restart.
- Login page SSO entry: `frontend/src/routes/auth/LoginPage.tsx:119` "Sign in with Microsoft" → `/auth/oidc/login`.
- SMTP outbound mail: fully real. `src/modules/notifications/infrastructure/adapters/nodemailer-smtp-email.transport.ts` (nodemailer@6) wired in `notifications.module.ts:65` with retryable-error classification. Config via `NOTIFICATIONS_SMTP_*` env (`src/shared/config/app-config.ts:220-226`).

PARTIAL / flagged-off / scaffold-only:
- M365 / AzureAD directory sync (D-156): the ONLY adapter implementation is `infrastructure/adapters/in-memory-m365-directory.adapter.ts` — it returns whatever array is passed to its constructor (default `[]`). `m365.module.ts:28` wires `InMemoryM365DirectoryAdapter` via `useValue: new InMemoryM365DirectoryAdapter()`. There is NO Microsoft Graph client (`grep` for `graph.microsoft|@azure/msal|@microsoft/microsoft-graph` = zero hits; no msal/graph dep in package.json). `POST /integrations/m365/directory/sync` runs the reconciliation/auto-provision pipeline (real Prisma persistence of links + `CreateEmployeeService`), but against an empty/in-memory source. `test-connection` (`m365-directory.controller.ts:55`) just calls `fetchUsers()` on the empty adapter and always reports reachable:true. Status service (`m365-directory-status.service.ts:42`) hardcodes `status: 'configured'`. So the pipeline, persistence model (`PersonExternalIdentityLink`, `IntegrationSyncState`), reconciliation review UI, and D-156 auto-provision gate (`sso.autoProvisionUsers`) are real; the Graph data source is absent.
- LDAP / AD adapter (F-4.7): `src/shared/ldap/ldap-directory-adapter.ts` is a real `ldapts@8` bind+search adapter (objectGUID/sAMAccountName/manager/memberOf, AD userAccountControl disable bit, JSON group→role map, reachability probe). BUT it is consumed only by `health.service.ts` (probe) and `integrations-registry.service.ts` (status display) — there is NO sync service that calls `fetchUsers()` to create/link Person rows. Its own header admits outbox/cron wiring is deferred. Flag `flag.feature.integrations.ldap.enabled` default OFF.
- OIDC auto-provision gate gap: `sso.autoProvisionUsers` is honored only in M365 directory sync, NOT in the live OIDC login path — `oidc.service.ts:117` unconditionally upserts a LocalAccount on every successful sign-in.

ABSENT (zero code):
- AzureAD HYBRID (Entra Connect / federated on-prem ADFS, hybrid join, pass-through claims): none.
- Microsoft Exchange on-prem (EWS / IMAP / Graph mailbox / inbound mail): none. Only outbound SMTP exists; no `ews|imap|exchange` server integration.
- Kerberos / SPNEGO / GSSAPI / Integrated Windows Auth: zero hits across `src/` and `frontend/src/`. No `kerberos`/`gssapi` dep. `passport-ldapauth` is in package.json but unused by any strategy (only `jwt-access` + `local` strategies exist in `src/modules/auth/strategies/`).
- SAML 2.0: none (deliberate — OIDC-only). Relevant because some CIS bank IdPs are SAML-first.

## Gaps

- No real Microsoft Graph adapter for M365/AzureAD: the M365 'directory sync' runs against an in-memory adapter returning [] — no @azure/msal-node + Graph client_credentials flow exists, so cloud directory import does not actually pull any users
- LDAP/AD adapter is built but orphaned: fetchUsers() is never called by a sync service; no Person creation/linking, no cron, no outbox wiring — only a health probe consumes it
- AzureAD HYBRID is entirely absent: no support for ADFS/Entra-federated tenants, hybrid-join identities, or on-prem-authoritative + cloud-token topologies common in banks mid-migration
- Microsoft Exchange on-prem is absent: only outbound SMTP exists; no EWS/IMAP/Graph-mailbox inbound, no Exchange-relay-aware send path, no shared-mailbox/calendar
- Kerberos / SPNEGO / Integrated Windows Auth has zero code — banks running intranet AD often expect seamless desktop SSO with no IdP redirect
- OIDC login does not enforce sso.autoProvisionUsers — every successful federated sign-in silently creates a LocalAccount even when the operator wants provisioning OFF (security/governance gap)
- M365 test-connection and status are stubs (always 'configured'/'reachable') — operators get a false-green that masks an unconfigured integration
- No role-mapping from IdP claims/groups on OIDC login: OIDC-created accounts get roles:[] and no personId, requiring manual linking — the IdP groups→role map only exists (unused) on the LDAP side
- No SAML 2.0 fallback for IdPs that don't expose OIDC discovery

## Product definition

Job-to-be-done: "When my bank standardizes on Microsoft identity (Entra ID cloud, on-prem AD, or hybrid) and on-prem Exchange mail, I want DeliveryCentral to authenticate users against our existing IdP, provision/deprovision people automatically from our authoritative directory, and send mail through our sanctioned relay — so that no employee gets a separate password, leavers lose access immediately, and InfoSec can approve the deployment without exceptions."

Personas:
- Bank IT/InfoSec admin (primary buyer-gate): needs OIDC/SSO that survives a security review, encrypted secrets, deterministic provisioning controls, audit trail. Today: OIDC works but auto-provision is not gated on login, and directory sync is a hollow shell.
- Bank IdP/AD engineer: needs to point DC at Entra OR on-prem AD OR a hybrid topology and have users + manager hierarchy + group→role mapping flow in. Today: only OIDC login works end-to-end; LDAP adapter exists but imports nothing; M365 imports nothing.
- DeliveryCentral operator (agentic.uz): needs a Test button that tells the truth and a runbook that matches reality. Today: M365 test is a false-green.
- End user (banker): wants to click 'Sign in with Microsoft' (works) or get seamless desktop SSO on the intranet (absent).

Minimal viable scope (bank-deployable identity baseline):
1. Make ONE real cloud path work end-to-end: Entra ID OIDC login (already shipped) + a REAL Microsoft Graph directory adapter (msal-node client_credentials → /users + /users/{id}/manager + transitiveMemberOf) replacing the in-memory M365 adapter, feeding the existing reconciliation/auto-provision pipeline.
2. Make ONE real on-prem path work end-to-end: wire the existing LdapDirectoryAdapter.fetchUsers() into a sync service that creates/links Person rows + applies group→role map, with a manual 'Run sync' button and reconciliation review (reuse M365 pipeline shape).
3. Honesty + governance: real test-connection/status for M365+LDAP; enforce sso.autoProvisionUsers in the OIDC login path; map IdP groups→roles on login.
Defer (separate epics): full hybrid AzureAD federation, on-prem Exchange inbound/EWS, Kerberos/SPNEGO, SAML.

## Recommendation

Sequence in 4 phases, value-first, reusing the existing pipeline so net-new surface is small.

Phase 1 — Close the credibility gaps in what's already shipped (S, do first):
(a) Enforce `sso.autoProvisionUsers` in `oidc.service.ts` — if OFF, only sign in users whose email already matches a Person/LocalAccount; never create. (b) Map IdP claims/groups → roles on OIDC login (reuse the JSON group-role-map pattern from the LDAP adapter; pull `roles`/`groups` claim). (c) Make M365 `test-connection`/status reflect reality instead of hardcoded `configured`. This makes the OIDC story bank-review-ready without new infra.

Phase 2 — Real Microsoft Graph (Entra cloud) adapter (L): add `@azure/msal-node`, implement a `GraphM365DirectoryAdapter implements M365DirectoryAdapter` using client-credentials (app registration, `User.Read.All`/`Directory.Read.All`), pull users + manager + group membership, swap `m365.module.ts` to select Graph-vs-in-memory by config/flag. The reconciliation pipeline, persistence, auto-provision gate, and review UI already exist — this is purely the data-source layer. Highest ROI: turns the hollow M365 feature into a real cloud directory import.

Phase 3 — Wire LDAP/AD sync to Person (M): add `LdapDirectorySyncService` that calls the existing `fetchUsers()`, runs it through a reconciliation flow mirroring M365 (create/link Person, apply group→role map, manager hierarchy), expose `POST /admin/integrations/ldap/sync` + status, add the deferred outbox/cron. Gives banks the on-prem path the runbook already promises.

Phase 4 — Strategic net-new (separate epics, scope on demand): hybrid AzureAD federation (XL — ADFS/Entra-Connect topology, on-prem-authoritative claims), on-prem Exchange inbound + Exchange-relay send (L–XL — EWS/Graph mailbox), Kerberos/SPNEGO desktop SSO (XL — `kerberos` native module, SPNEGO Negotiate handshake, keytab/SPN ops, reverse-proxy interplay), and optional SAML 2.0 fallback (M). These are architectural runway, not MVP — most CIS banks can launch on Entra-OIDC + Graph + LDAP (Phases 1-3).

Rationale: Phases 1-3 are ~80% reuse of existing pipeline/UI and unlock the realistic agentic.uz deployment shape (Entra OR on-prem AD). Kerberos/Exchange/hybrid are real bank asks but are independently large and should not gate the first identity-credible release.

## Dependencies

- openid-client@6 (present), nodemailer@6 (present), ldapts@8 (present)
- NEW: @azure/msal-node + @microsoft/microsoft-graph-client for Phase 2 (not in package.json — requires approval; both MIT/Apache-2.0)
- NEW: kerberos native module for Phase 4 SPNEGO (native deps — Docker base-image impact, ops keytab management)
- Entra app registration with Directory.Read.All / User.Read.All admin-consented (operator-side)
- Read-only LDAP bind credentials + base DN + group→role map (operator-side, env: LDAP_*)
- PlatformSettings encryption (authJwtSecret-derived key) already used by SsoAdminService
- Existing pipeline deps: PersonExternalIdentityLink + IntegrationSyncState Prisma models, CreateEmployeeService, reconciliation review UI
- Bank firewall egress to login.microsoftonline.com + graph.microsoft.com (cloud) or intranet AD/Exchange reachability (on-prem)
- Reverse-proxy / TLS-termination config must forward Authorization: Negotiate headers for any Kerberos work

## Risks

- False-green operator experience TODAY: M365 test-connection and status always report success against an empty in-memory adapter — an operator could believe directory sync works when it imports zero users (current-state honesty bug, fix in Phase 1)
- Security/governance: OIDC login auto-creates LocalAccounts regardless of sso.autoProvisionUsers — in a bank, uncontrolled account creation on first federated sign-in can fail an InfoSec review
- Hybrid AzureAD is the hardest real-world case: federated (ADFS) tenants, conditional-access, and on-prem-authoritative claims mean a naive Graph client-credentials adapter may not see on-prem-only users or may hit token/issuer mismatches
- Kerberos/SPNEGO inside a corporate domain is operationally heavy: requires SPN registration, keytab rotation, AD time-sync, and a reverse proxy that does not strip the Negotiate header; native `kerberos` module complicates the Docker image and breaks the pure-TS-deps posture
- On-prem Exchange varies wildly (EWS deprecation, Graph-on-prem absence, legacy 2013/2016/2019, basic-auth disablement) — a single adapter rarely covers all; inbound mail processing also adds an attack surface
- Group→role mapping from IdP claims can over-privilege if the mapping JSON is misconfigured; needs an explicit allowlist + default-deny
- Secret handling: SMTP and LDAP bind passwords live in env, OIDC secret in PlatformSettings — two different secret stores; a bank may require a single KMS/Vault path
- CIS-market IdPs may be SAML-first or non-Microsoft (e.g., national Gov-ID) — OIDC-only assumption could block some Uzbekistan bank tenants
- Deprovisioning/leaver flow is implicit: directory sync must mark disabled AD/Entra users inactive in DC, or leavers retain access — pipeline supports the `disabled`/`accountEnabled` flags but the off-boarding action path needs verification

---

# BA / Product Discovery — Identity & Mail Integrations (M365 / AzureAD hybrid, Exchange, Kerberos / SSO / OAuth 2.0)

_Area owner: Identity & mail integrations. Target market includes CIS / Uzbekistan banks (agentic.uz). All claims grounded in code as of branch `main` @ commit b1ab1ae5._

---

## 1. Current state (code-grounded)

### 1.1 Shipped / fully-built

| Capability | Evidence | Maturity |
|---|---|---|
| **OIDC / OAuth 2.0 Auth-Code + PKCE login (D-155)** | `src/modules/auth/oidc.service.ts` — `openid-client@6`, discovery, PKCE S256, state, ID-token `email` claim → `LocalAccount.upsert`. `src/modules/auth/oidc.controller.ts` — `GET /api/auth/oidc/login` + `/callback`, Public + `SkipDemoGuard`, throttled, httpOnly **signed** state cookie, open-redirect guard. IdP-agnostic (Entra/Okta/Keycloak/Ping/Google). | **Fully built**, flag OFF |
| **Self-serve SSO admin (NEW-LGL-2)** | `src/modules/auth/sso-admin.service.ts` + `sso-admin.controller.ts` — `GET/PUT /api/admin/sso/config`, `POST /api/admin/sso/test`, `@RequireRoles('admin')`. Client secret **AES-256-GCM** at rest (key derived from `authJwtSecret`), masked on GET. Mirrors `sso.*`→`sso.idp.*` so the live handler reloads without restart. UI: `frontend/src/routes/admin/SsoAdminPage.tsx` (provider presets Google / Azure AD / Okta / generic OIDC + Test button). | **Fully built** |
| **Login page SSO entry** | `frontend/src/routes/auth/LoginPage.tsx:119` — "Sign in with Microsoft" → `/auth/oidc/login`. | **Fully built** |
| **Outbound SMTP mail** | `src/modules/notifications/infrastructure/adapters/nodemailer-smtp-email.transport.ts` (`nodemailer@6`), wired live in `notifications.module.ts:65` (`useClass`), retryable-error classification, config `NOTIFICATIONS_SMTP_*` (`app-config.ts:220-226`). | **Fully built** |

Flags: `flag.feature.integrations.oidc.enabled` (default **OFF**), `...m365.enabled` (default **ON**), `...ldap.enabled` (default **OFF**) — `frontend/src/lib/feature-flags.ts:170-174`, `src/shared/config/platform-flags.service.ts:659-695`.

### 1.2 Partial / flagged-off / scaffold-only

**M365 / AzureAD cloud directory sync (D-156) — hollow shell.** The reconciliation + persistence + auto-provision machinery is real, but the **data source is fake**:
- `m365.module.ts:28` wires `InMemoryM365DirectoryAdapter` via `useValue: new InMemoryM365DirectoryAdapter()`. That adapter (`infrastructure/adapters/in-memory-m365-directory.adapter.ts`) returns whatever array is in its constructor — **default `[]`**.
- **No Microsoft Graph code exists.** `grep graph.microsoft|@azure/msal|@microsoft/microsoft-graph` → 0 hits; no msal/graph dep in `package.json`.
- `POST /integrations/m365/directory/sync` (`m365-directory.controller.ts:27`) runs the **real** reconciliation pipeline (`m365-directory-sync.service.ts` — `PersonExternalIdentityLink`, `IntegrationSyncState`, `CreateEmployeeService`, D-156 `sso.autoProvisionUsers` gate at line ~54) — but against an empty source.
- `test-connection` (`controller.ts:55`) just calls `fetchUsers()` on the empty adapter → **always reachable:true**. `m365-directory-status.service.ts:42` hardcodes `status: 'configured'`.

**LDAP / AD adapter (F-4.7) — built but orphaned.** `src/shared/ldap/ldap-directory-adapter.ts` is a genuine `ldapts@8` bind+search adapter (objectGUID/sAMAccountName/manager/memberOf, AD `userAccountControl` disable bit, JSON group→role map, reachability probe). **But** consumers are only `health.service.ts` (probe) and `integrations-registry.service.ts` (status display). **No sync service calls `fetchUsers()`** to create/link Person rows. The adapter's own header admits "Outbox event wiring … lands in a follow-up." `LdapModule` is `@Global` but exports only the adapter.

**OIDC auto-provision gate gap.** `sso.autoProvisionUsers` is enforced **only** in M365 directory sync, **not** in the live OIDC login path — `oidc.service.ts:117` unconditionally `LocalAccount.upsert(...)` on every successful sign-in, with `roles: []` and no `personId`.

### 1.3 Absent (zero code)

| Ask | Status | Evidence |
|---|---|---|
| AzureAD **HYBRID** (ADFS/Entra-Connect federation, hybrid-join, on-prem-authoritative claims) | **Absent** | no federation/hybrid code |
| **Microsoft Exchange on-prem** (EWS/IMAP/Graph-mailbox inbound; Exchange-relay send) | **Absent** | only outbound SMTP; `grep ews|imap|exchange` server = 0 |
| **Kerberos / SPNEGO / GSSAPI / IWA** | **Absent** | 0 hits in `src/` + `frontend/src/`; no `kerberos`/`gssapi` dep. `passport-ldapauth` is in `package.json` but **unused** (only `jwt-access` + `local` strategies exist). |
| **SAML 2.0** | **Absent** (deliberate, OIDC-only) | relevant — some CIS bank/Gov IdPs are SAML-first |

The deployment runbook (`docs/planning/bank-it-deployment-runbook.md` §2.1–2.2, §150-151) already **promises** working SSO test-green and "LDAP Test sync → ≥10 Person rows with manager hierarchy" — neither is true today (M365 test is false-green; LDAP sync is unwired).

---

## 2. Job-to-be-done & personas

**JTBD:** *"When my bank standardizes on Microsoft identity (Entra cloud, on-prem AD, or hybrid) and on-prem Exchange mail, I want DeliveryCentral to authenticate against our existing IdP, auto-provision/deprovision people from our authoritative directory, and send mail through our sanctioned relay — so no employee needs a separate password, leavers lose access immediately, and InfoSec approves the deployment without exceptions."*

| Persona | Need | Today |
|---|---|---|
| Bank IT/InfoSec admin (buyer-gate) | Review-proof SSO, encrypted secrets, deterministic provisioning controls, audit | OIDC works; auto-provision **not gated** on login; directory sync hollow |
| Bank IdP/AD engineer | Point DC at Entra OR on-prem AD OR hybrid; users + manager + group→role flow in | Only OIDC login works E2E; LDAP imports nothing; M365 imports nothing |
| DC operator (agentic.uz) | A Test button that tells the truth; runbook matching reality | M365 test = false-green |
| End user (banker) | Click "Sign in with Microsoft" (works) or seamless desktop SSO (absent) | Partial |

**Minimal viable bank-identity baseline:** make ONE cloud path (Entra OIDC + real Graph import) and ONE on-prem path (LDAP sync) truly end-to-end, plus close the honesty/governance gaps. Defer hybrid/Exchange/Kerberos/SAML to separate epics.

---

## 3. Options & trade-offs

**A. Ship honesty + governance fixes only (Phase 1).** Pro: small, makes OIDC bank-review-ready. Con: directory import still hollow. *Necessary but insufficient.*

**B. Real Graph adapter (cloud) first.** Pro: highest ROI — pipeline/UI already exist, only the data-source layer is missing; matches the most common bank topology (Entra). Con: adds `@azure/msal-node` + Graph dep (approval needed); doesn't help on-prem-only banks.

**C. Wire LDAP sync first (on-prem).** Pro: no new deps; serves air-gapped/on-prem banks; adapter already written. Con: smaller cloud market; still needs reconciliation/cron build-out.

**D. Go straight for hybrid/Kerberos/Exchange.** Pro: covers the hardest asks. Con: XL each, native deps, ops-heavy, not required to launch — would delay a credible first release by quarters.

**Recommended: A → B → C, with D as scoped-on-demand runway.** A+B+C are ~80% reuse of the existing reconciliation pipeline and persistence model; they unlock the realistic agentic.uz shapes (Entra OR on-prem AD).

---

## 4. Phased action list

### Phase 1 — Make shipped surface credible (Effort: **S**) — DO FIRST
1. Enforce `sso.autoProvisionUsers` in `oidc.service.ts`: if OFF, sign in only emails that already match a Person/LocalAccount; never create. *Verify: OIDC login with flag OFF + unknown email → 401, no new LocalAccount.*
2. Map IdP `groups`/`roles` claim → platform roles on OIDC login (reuse the JSON group-role-map pattern from `ldap-directory-adapter.ts`). *Verify: claim with mapped group → account gets role.*
3. Real M365 `test-connection`/status: stop hardcoding `configured`/`reachable:true`; report not-configured when no Graph creds. *Verify: unconfigured tenant → status `not_configured`.*

### Phase 2 — Real Microsoft Graph adapter (Entra cloud) (Effort: **L**)
4. Add `@azure/msal-node` + `@microsoft/microsoft-graph-client` (approval required). Implement `GraphM365DirectoryAdapter implements M365DirectoryAdapter` (client-credentials, `Directory.Read.All`/`User.Read.All`): `/users`, `/users/{id}/manager`, `/users/{id}/transitiveMemberOf`. *Verify: against an Entra test tenant, `fetchUsers()` returns ≥1 real user.*
5. Swap `m365.module.ts` to select Graph-vs-in-memory by config/flag. Pipeline, persistence, D-156 gate, reconciliation review UI already exist. *Verify: `POST /directory/sync` creates/links real Person rows + manager hierarchy.*

### Phase 3 — Wire LDAP/AD sync to Person (Effort: **M**)
6. `LdapDirectorySyncService` calling existing `fetchUsers()`; reconciliation mirroring M365 (create/link Person, apply group→role map, manager hierarchy, honor `disabled`→deactivate). Expose `POST /admin/integrations/ldap/sync` + status; add deferred outbox/cron. *Verify: runbook §151 passes — Test sync → ≥10 Person rows with hierarchy.*

### Phase 4 — Strategic runway (scope on demand, separate epics)
7. Hybrid AzureAD federation (**XL**) — ADFS/Entra-Connect, on-prem-authoritative claims, conditional-access tolerance.
8. On-prem Exchange (**L–XL**) — EWS/Graph-mailbox inbound + Exchange-relay send; legacy-version matrix.
9. Kerberos/SPNEGO desktop SSO (**XL**) — `kerberos` native module, Negotiate handshake, SPN/keytab ops, reverse-proxy header pass-through.
10. SAML 2.0 fallback (**M**) — for IdPs without OIDC discovery (some CIS/Gov IdPs).

---

## 5. Effort / dependencies summary

- **Overall area effort: XL** (Phase 1 S, Phase 2 L, Phase 3 M, Phase 4 XL aggregate).
- **New deps:** `@azure/msal-node` + Graph client (Phase 2, approval), `kerberos` native (Phase 4 — Docker/base-image + breaks pure-TS-deps posture).
- **Present deps:** `openid-client@6`, `nodemailer@6`, `ldapts@8`, `@nestjs/passport`.
- **Operator-side:** Entra app reg + admin consent; read-only LDAP bind + base DN + group→role map; firewall egress to `login.microsoftonline.com`/`graph.microsoft.com` (cloud) or intranet AD/Exchange reachability; reverse proxy that forwards `Authorization: Negotiate` for any Kerberos work.
- **Reused platform:** `PersonExternalIdentityLink` + `IntegrationSyncState` models, `CreateEmployeeService`, reconciliation review UI, PlatformSettings AES-GCM secret store.

---

## 6. Risks

1. **False-green today** — M365 test/status always report success against an empty adapter; operators may believe sync works. (Fix Phase 1.)
2. **Governance** — OIDC auto-creates accounts regardless of `sso.autoProvisionUsers`; can fail InfoSec review.
3. **Hybrid is the hardest case** — federated/ADFS tenants and on-prem-authoritative claims may be invisible to a naive Graph client-credentials adapter; issuer/token mismatches.
4. **Kerberos/SPNEGO ops weight** — SPN/keytab/time-sync, native module in Docker, proxy must not strip Negotiate.
5. **Exchange fragmentation** — EWS deprecation, no Graph-on-prem, basic-auth disablement, 2013–2019 variance; inbound mail adds attack surface.
6. **Over-privilege via group→role map** — needs explicit allowlist + default-deny.
7. **Two secret stores** — SMTP/LDAP in env, OIDC secret in PlatformSettings; a bank may require single KMS/Vault.
8. **CIS market fit** — OIDC-only assumption may block SAML-first or national-Gov-ID IdPs.
9. **Deprovisioning** — sync must deactivate disabled AD/Entra users or leavers retain access; flags exist (`disabled`/`accountEnabled`) but the off-boarding action path needs verification.

---

## 7. Bottom line

The **authentication front door (OIDC/OAuth2 + PKCE) and outbound SMTP are production-real.** The **directory-import back end is a convincing skeleton with no data source** — M365 is in-memory-only, LDAP is built-but-unwired. The fastest path to a bank-deployable identity story is **Phase 1 (honesty + governance, S) → Phase 2 (real Graph adapter, L) → Phase 3 (LDAP sync wiring, M)**, all heavily reusing the existing reconciliation pipeline. **Hybrid AzureAD, on-prem Exchange, and Kerberos/SPNEGO are genuine bank asks but each is an independent XL epic** and should be treated as architectural runway, not launch-blocking — most CIS/Uzbekistan banks can go live on Entra-OIDC + Graph + LDAP.
