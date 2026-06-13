# EPIC D — Real Directory Sync (M365 Graph + LDAP + OIDC governance)

**Status:** decomposed; implementation in progress (keystone, flag-gated + contract-tested per user decision — no live creds in this env). Priority P1, effort L. **Branch:** `feat/epic-d-oidc-governance`. **Analysis:** `../E3-identity-integrations.md`.

## Why (keystone)
Identity/SSO scaffolding shipped in Sprint F-4 (OIDC handler D-155, M365 adapter + auto-provision gate D-156, LDAP/AD adapter F-4.7, `/admin/integrations/sso`), but three honesty/governance gaps make it not bank-review-ready, and the M365 reconciliation engine here is the seam EPICs E (Jira/JSM) and F (1C) both extend. Build D before E/F.

## JTBD
> As a bank IT admin, I need SSO + directory sync that is **honest** (real provider health, not a fake "reachable"), **governed** (auto-provisioning is a deliberate setting, IdP roles map to platform roles), and **real** (M365 Graph + LDAP actually sync users/org), so I can pass security review and not hand-manage accounts.

## Atomic items
| # | Item | Layer | Notes | Status |
|---|------|-------|-------|--------|
| D1 | **OIDC auto-provision governance** — the OIDC login path must enforce `sso.autoProvisionUsers`: don't silently create LocalAccounts when it's off; when on, map the IdP groups/roles claim → platform roles. | BE | S, fully unit-testable (no external system). Find the OIDC callback/login handler (`src/modules/auth/*`). **Best first slice.** | ⏳ |
| D2 | **Honest provider status** — replace M365's hardcoded `reachable: true` / `'configured'` test-connection response with a real status: "not configured" when creds absent; a flag-gated Graph probe when configured. | BE | S, testable (no-creds → not reachable). `m365-directory.controller.ts` + `m365-test-connection-response.contract.ts`. | ⏳ |
| D3 | **M365 Graph directory adapter** — real users/groups sync via Microsoft Graph, behind a feature flag; contract tests against a mocked Graph client. | BE | L. `m365-directory-sync.service.ts`. flag-gated + contract-tested = done. | ⏳ |
| D4 | **LDAP wiring** — wire `LdapDirectoryAdapter` (F-4.7) into the directory-sync flow + admin "Run sync"/"Test connection". | BE | M. flag-gated + contract-tested. | ⏳ |

## Acceptance criteria
- D1: with `autoProvisionUsers` OFF, an unknown OIDC subject does **not** auto-create a LocalAccount; with it ON, roles derive from the mapped IdP claim. Unit tests both paths.
- D2: status reflects real config (no fake green); test asserts "not reachable" with no creds.
- D3/D4: adapters compile + pass contract tests with mocked clients; behind flags (off by default); live-verify deferred to when creds exist.
- BE tsc + jest clean; ds-conformance N/A (BE).

## Inventory validation
`action-inventory.json` has `/admin/integrations/sso`, M365/LDAP "Run sync"/"Test connection" actions. This epic makes those actions **truthful + governed** (no new actions; closes the fake-status + silent-provision gaps). Ledger: sso.autoProvision-governance + m365.status-honest + graph/ldap-sync wired.

## Sequencing
D unblocks **E** (Jira/JSM piggybacks the same outbox/registry patterns) and **F** (1C rides the generalized directory engine). After D: E and F can parallelize; G (budget import) follows EPIC A; H (connector builder) is last (security-gated).
