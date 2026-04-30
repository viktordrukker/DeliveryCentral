# UX Contract — `DimensionDetailModal`

**Component:** [`DimensionDetailModal.tsx`](../../../frontend/src/components/projects/DimensionDetailModal.tsx)
**Invoked from:**
- [`RadiatorTab`](../../../frontend/src/routes/projects/tabs/RadiatorTab.tsx) — opens with `initialFocusKey` set when the user clicks a specific axis on the radar chart, so the modal scrolls to that sub-dimension's row.
- [`PulseReportForm`](../../../frontend/src/components/projects/PulseReportForm.tsx) — opens via the "+ Report detailed status" button (no focus key).

**Grammar:** Form Modal — multi-row (per-dimension) editor with two submit paths (Save draft / Save + Submit) and a Cancel.
**Last verified:** 2026-04-27 against `7c495e6` (pre-DS-2-7 Tier C3 migration).

This is the largest single modal in DS-2 (~478 LoC). The contract is intentionally detailed.

---

## 1. Open / close lifecycle

| Trigger | Behavior |
|---|---|
| `open === true` | Inner mounts. If `report` prop is undefined and `report` state is null, fetches `GET /api/projects/{id}/pulse-report` lazily. Pending state is re-seeded with current narratives from `report.dimensions.detailed[key].narrative`. |
| `open === false` | Returns `null` entirely (no DOM, no state). |
| Cancel button | `onClose()`. No dirty-guard — discards all pending changes silently. |
| Backdrop click (when not saving) | `onClose()`. |
| Escape key | Modal default — closes via `onClose`. |
| Successful submit / save | `toast.success(...)`, `onSaved({ snapshot, report })`, then `onClose()`. |

## 2. Layout — quadrant-grouped fieldsets

Active sub-dimensions are computed from `activeAxesFor(shape)` — the project shape's enabled axes. Grouping order: **Scope → Schedule → Budget → People** (`quadrantOrder`).

Per quadrant, sub-dimensions render as `<fieldset>` rows (one per active key), in the order returned by `activeAxesFor`.

Each fieldset row shows:
- **Legend**: `AXIS_LABELS[key] ?? key` (bold, fontSize 12)
- **Info bar**: Auto score / Effective score / band chip / "⚙ Overridden" indicator (when sub.overrideScore is set) / `sub.explanation` text
- **Form grid** (`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`):
  - Narrative textarea
  - Override score input + Reason textarea (latter conditional, see §4)
- **Visual styling**:
  - Default border: `var(--color-border)` 1px solid
  - Left border: 3px solid in band color (red/amber/green)
  - When `initialFocusKey === key`: border becomes `var(--color-accent)` + `boxShadow: var(--shadow-card)`

## 3. Initial focus / scroll-to behavior

When `initialFocusKey` is provided, the modal:
1. Highlights the matching fieldset (accent border + shadow)
2. After mount + `requestAnimationFrame`, scrolls that fieldset into view (`behavior: 'smooth', block: 'center'`)

Refs are stored in `rowRefs.current[key]` via callback ref pattern.

## 4. Form fields per dimension

| Field | Type | Validation | Required |
|---|---|---|---|
| Narrative | `<textarea rows={3} maxLength=600>` | None | No (blank = no entry) |
| Override score | `<input type="number" min=0 max=4 step=0.1>` | Parsed via `parseScore` (clamps 0–4, rounds to 1 decimal). Empty = no override. | No |
| Reason | `<textarea rows={2} maxLength=1000>` | Conditional: only shown when override score is non-empty. Must be ≥ **10 chars** (`MIN_OVERRIDE_REASON`). Char counter shows `${chars}/${MIN}` — turns red when below minimum. | When override score is set |

`pending` state shape: `Record<key, { narrative: string; overrideScore: string; overrideReason: string }>`. Initialized from existing report narratives on each open.

## 5. Submit-time validation

`handleSave(submit: boolean)` validates ALL active dimensions in a single pass:
- For each key with a parsed override score AND `reason.trim().length < 10` → push error `${AXIS_LABELS[key] ?? key}: reason must be ≥ 10 chars`
- If errors array is non-empty: `toast.error(errors[0])` (only the FIRST error toasts) and abort the save.
- Otherwise, proceeds to apply overrides + upsert pulse report.

## 6. Submit paths

Two distinct primary submit paths plus a Cancel:

| Button | Trigger | API calls |
|---|---|---|
| **Save draft** | `handleSave(false)` | `POST /api/projects/{id}/radiator/override` (sequential, per override) → `POST /api/projects/{id}/pulse-report` with `submit: false` |
| **Save + Submit** | `handleSave(true)` | Same API sequence, but `submit: true` on the upsert — promotes the pulse report to "submitted" state |
| **Cancel** | `onClose()` | None — silently discards pending changes |

**Critical**: overrides fire **sequentially** (not parallel) so the server-side audit ordering is deterministic. Each `applyRadiatorOverride` returns the latest snapshot, which is what `onSaved` receives.

## 7. Toast triggers

| Event | Toast |
|---|---|
| Successful save (draft) | `toast.success('Detailed draft saved')` |
| Successful save (submit) | `toast.success('Detailed status submitted')` |
| Validation failure | `toast.error('${first error message}')` (only the first error in the list) |
| API failure | `toast.error('${error.message}' ?? 'Save failed')` |

## 8. Pending changes summary

Footer area shows live count just above the action buttons:
- `${changedOverrideCount} override${s} pending` (when ≥1 override)
- `${changedNarrativeCount} narrative${s/changes} pending` (when ≥1 narrative differs from existing)
- Falls back to `'No pending changes'` when both are 0

## 9. Disabled / loading states

- All inputs (narrative, override score, reason) `disabled={saving}`
- Save draft / Save + Submit / Cancel all `disabled={saving}`
- Save draft button label changes to "Saving..." while saving (the Save + Submit button label stays unchanged in original code — pattern preserved verbatim)

## 10. Other notable behaviors

- **Lazy report fetch**: when opened without a `report` prop, fetches `GET /api/pulse-report?projectId=...` once and caches in state.
- **External report sync**: `useEffect` syncs `report` state when `reportProp` changes externally.
- **`data-testid="dimension-detail-modal"`** preserved on the modal element.
- **`aria-modal="true"` + `role="dialog"`** preserved — DS Modal supplies these automatically post-migration.

---

## Mapped regression spec

[`e2e/ux-regression/DimensionDetailModal.spec.ts`](../../../e2e/ux-regression/DimensionDetailModal.spec.ts) — covers smoke flows (open via radiator-tab axis click / Cancel / submit-validation surfacing). Per-dimension override + narrative editing flows are documented but not yet automated (requires deep fixture setup; the contract is the source of truth).
