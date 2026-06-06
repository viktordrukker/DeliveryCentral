# SOP — Edit Access Policies (ABAC)

**Audience:** Platform admins / RBAC engineers with shell access.
**Last updated:** Sprint W4 (2026-06-06).

---

## Why this SOP exists

`/admin/access-policies` is **read-only** in v1. The in-app edit affordance is
gated behind the feature flag `flag.feature.admin.rolePermissionUI.enabled`
(`adminRolePermissionUI`, D-159) and is **OFF by default** until the role-redefinition
UI has completed its 30-day staging soak.

Until the flag flips to GA, ABAC policy edits are performed through this
runbook. The /admin/access-policies page surfaces a link to this SOP so admins
have a discoverable path forward.

---

## Where policies live

| Concern | Location |
|---|---|
| ABAC registry (source of truth) | `src/modules/identity-access/application/abac/abac-policy.registry.ts` |
| Runtime evaluation | Repository layer — every aggregate query passes through the registry |
| Tenant overrides (post-GA) | `PlatformSetting` rows keyed `abac.policy.<id>.override` |
| Audit trail | `AuditLog` rows with `action = 'abac_policy.updated'` once Sprint W4-09 closes |

---

## Procedure — edit a policy

1. **Identify the policy.** Open `/admin/access-policies` in the app and copy
   the policy `id` you intend to change. Note the current `roles`, `resource`,
   `action`, and `description` columns.
2. **Open the registry file.**
   `src/modules/identity-access/application/abac/abac-policy.registry.ts`
3. **Modify only the entry you targeted.** Do not refactor surrounding
   policies. Each policy is a literal object with `id`, `roles`, `resource`,
   `action`, `description`, and optional `predicates`.
4. **Stage the change as a PR.** The change must be reviewed by an `rbac-eng`
   approver. Include the before/after row in the PR description.
5. **Run the registry test suite:**
   `npm run test -- abac-policy.registry`
6. **Run the affected repo tests** for each `resource` you touched (e.g. if you
   altered `resource: "project"`, run `npm run test -- project`).
7. **After merge to main**, the change ships with the next staging deploy.
   Verify in `/admin/access-policies` that the row reflects the new values.
8. **Audit log:** create a manual `AuditLog` entry through the audit-event
   admin tool with `action = 'abac_policy.updated'`, payload `{ policyId, before, after, prUrl }`.

---

## Procedure — add a new policy

Same as above, plus:

- Assign a **stable kebab-case `id`** (e.g. `case-assignee-read`). Once shipped
  the id is referenced in audit logs and tenant overrides — do not rename later.
- Add a description that names the protected resource and the access scope in
  one sentence. The string is shown verbatim in the admin UI.

---

## Procedure — emergency policy disable

If a policy must be turned off in production immediately:

1. SSH the prod VM (`ssh -i ~/.ssh/deliverit_cx13 -l deploy <host>`).
2. `docker compose exec backend node -e "..."` to set the corresponding
   `PlatformSetting` override row to `{ disabled: true }`.
3. Bounce the backend pods so the registry re-reads.
4. File a P1 ticket and follow the post-incident review procedure in
   `docs/runbooks/panic.md`.

---

## When `adminRolePermissionUI` flips to GA

The page will surface an **Edit role presets** button (already coded — see
`AccessPoliciesPage.tsx`). This SOP remains the fallback for emergency disable
and bulk migrations even after GA.
