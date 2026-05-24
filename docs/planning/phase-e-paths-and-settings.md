# Phase E — paths + audit + settings scope (issues #311 #312 #316)

## Issue #311 — notification + webhook URL alignment

**Audit result:** No hard-coded legacy paths found in notification templates or webhook payloads.

Searched paths:
- `src/modules/in-app-notifications/templates/*` — no template references legacy URLs
- `src/modules/notifications/*` — no path emissions
- `src/modules/integrations-hub/*` — M365 / JSM / LDAP adapters don't emit hard-coded app URLs
- `src/shared/config/platform-flags.service.ts` — contains `/dashboard/exec` etc. only in **description strings** for flag entries, not in URL emissions

**Conclusion:** No code change needed in this PR. The future-proofing recommendation from the issue (use canvas-canonical paths in new templates) is captured by the `LEGACY_PATH_MAP` constant landed under #312 — any new template author can reference it to pick the canonical side of a pair.

## Issue #312 — BusinessAudit canonical-path map

**Shipped in this PR:**

- `src/shared/audit/legacy-path-map.ts` — `LEGACY_PATH_MAP` constant + `canonicalisePath()` + `pathsAreEquivalent()` helpers
- 7-test spec covers all 5 redirect pairs, direct equality, bidirectional matching, and unknown-path null behaviour

**Deferred (FE-#312 follow-up):**

The audit-write path enhancement (`metadata.canonicalPath` field populated on every write) is intentionally deferred. The map is exported so:

1. `BusinessAuditQueryService` can use `pathsAreEquivalent()` to broaden its `path=...` filter when an admin searches by either side of a redirect pair.
2. Future audit writers can compute `metadata.canonicalPath` at write time using `canonicalisePath()`.
3. A FE-side migration of the BusinessAuditPage to surface both fields lands when the FE redesign needs it.

Adding the write-time hook to every AuditLog emission point is a 10+ touchpoint change with non-trivial test rebaselining; out of scope for this surfacing PR.

## Issue #316 — Settings scope decision

**Decision: canvas "Settings" sidebar item points to `/admin/settings`. No new `/settings` route.**

### Reasoning

| Aspect | Choice | Why |
|---|---|---|
| Sidebar destination | `/admin/settings` | Existing route, ADMIN_ROLES-gated, covers platform config / theme / notifications / org defaults / cost-rate visibility |
| Feature flags | Stay under Admin → Governance tab | Operational governance concern; not per-user "settings" |
| Access policies | Stay under Admin → Governance tab | Pure governance |
| Per-user notification prefs | Under `/me/settings` (canvas Workspace) | These are personal, not admin — already shipped as part of /me workspace |
| Per-user theme | Under `/me/settings` (canvas Workspace) | Personal |

### What lives where (canvas Settings vs Admin)

| Canvas "Settings" → `/admin/settings` | Canvas "Admin" → `/admin/*` tabs |
|---|---|
| Platform name, timezone, currency, date format | Tenant identity + setup wizard rerun |
| Fiscal year start | Integrations registry (M365, LDAP, JSM, etc.) |
| Cost-rate visibility toggle | Feature flags |
| Default org-level settings | Access policies + role permissions |
| Notification dispatch defaults (org-wide) | Audit retention + dispatch ops |

### Settings-aggregator endpoint

Per-user settings already surface through:
- `GET /api/me/notification-prefs` (in-app channel prefs)
- `GET /api/me/notification-digest` (digest schedule + quiet hours)
- `GET /api/admin/settings/*` (platform settings — admin-only)

No new aggregator (`GET /api/settings/me`) needed today — the canvas Settings page is a thin shell over the existing `/admin/settings` controller. If FE later wants a single-call payload, that becomes a separate small PR.

## Reference

- Plan: `/home/drukker/.claude/plans/v2-lean-restructure-phase-e.md` §6 → NEW-E3, NEW-E4, NEW-E8
- LEGACY_PATH_MAP: `src/shared/audit/legacy-path-map.ts`
- Test: `test/unit/shared/legacy-path-map.spec.ts`
