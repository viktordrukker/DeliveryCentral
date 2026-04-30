# UX Contract — `CasesPage`

**Route:** `/cases` ([`route-manifest.ts:157`](../../../frontend/src/app/route-manifest.ts#L157))
**Component:** [`CasesPage.tsx`](../../../frontend/src/routes/cases/CasesPage.tsx)
**Grammar:** Operational Queue (Grammar 5)
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `ALL_ROLES`. "Create case" gated by `CASE_CREATE_ROLES`.
- **Self-scope:** none.

## 2. Click paths

| Trigger | Destination |
|---|---|
| "Create case" (title bar) | `/cases/new` (gated) |
| Export | client-side CSV download (caseNumber, type, subject, owner, status, summary, opened, closed) |
| TipTrigger | toggle global tips |
| Case-type text input | filter; re-fetch |
| Owner Person dropdown | filter; re-fetch |
| Subject Person dropdown | filter; re-fetch |
| Row click | `/cases/{id}` |
| Empty-state "Create Case" | `/cases/new` |

## 3. Form validation

| Filter | Rule |
|---|---|
| Case Type Key | trimmed before API |
| Owner Person ID | trimmed |
| Subject Person ID | trimmed |

No `<form>` elements.

## 4. Confirmation prompts

_None._

## 5. Toast / notification triggers

_None._

## 6. Filters / sort / pagination / saved views

| URL param | Default |
|---|---|
| `caseTypeKey` | `''` |
| `ownerPersonId` | `''` |
| `subjectPersonId` | `''` |

Defaults removed from URL. No pagination, no sort, no localStorage.

## 7. Empty / loading / error states

| State | Copy / CTA |
|---|---|
| Loading | skeleton table |
| Error | `<ErrorState description={state.error} onRetry={state.reload} />` |
| Empty | title "No cases open"; description "No cases are available for the current filters."; action `/cases/new` "Create Case" |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount, filter change | `GET /cases?caseTypeKey&ownerPersonId&subjectPersonId` |

## 9. Other notable behaviors

- **PersonSelect** components for owner / subject filters (async fetch).
- **Full row clickable** → detail.

---

## Mapped regression spec

[`e2e/ux-regression/CasesPage.spec.ts`](../../../e2e/ux-regression/CasesPage.spec.ts)
