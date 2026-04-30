# UX Contract — `CreateAssignmentModal`

**Component:** [`CreateAssignmentModal.tsx`](../../../frontend/src/components/assignments/CreateAssignmentModal.tsx)
**Invoked from:** [`PlannedVsActualPage`](../../../frontend/src/routes/dashboard/PlannedVsActualPage.tsx) (reconciliation actions on rows), [`BatchAssignmentConfirmModal`](../../../frontend/src/components/assignments/BatchAssignmentConfirmModal.tsx) (batch flow per-row).
**Grammar:** Form Modal with nested confirmations.
**Last verified:** 2026-04-27 against `7c495e6` (pre-DS-2-7 Tier C3 migration).

This is a Tier C3 form modal (separate-turn migration per [`ds-deferred-items.md`](../ds-deferred-items.md) Group C). The contract is intentionally detailed because the migration must preserve nested confirmation flows verbatim.

---

## 1. Open / close lifecycle

| Trigger | Behavior |
|---|---|
| `open && preFill` are both truthy | Inner modal renders. Pre-fill arrives with `personId`, `personName`, `projectId`, `projectName`, optional `contextHours`, `contextDate`, `personStatus`, `personTerminatedAt`. |
| `open === false` or `preFill === null` | Modal returns null entirely (the inner is never mounted; defers `useAuth()` and `useState` init — pitfall #15 in CLAUDE.md). |
| Cancel button click | If form is dirty AND not submitting → opens **Discard changes?** confirm. Else → `onCancel()`. |
| Escape key | Same as Cancel button. Captured in capture-phase listener and `event.stopPropagation()` so outer overlays don't also handle it. |
| Backdrop click | Same as Cancel button. Mouse-down + mouse-up must both occur on the backdrop (mousedown-tracked via ref) to prevent inadvertent close from drag-out-of-input. |
| Successful submit | `onSuccess(response)` fires; parent unmounts the modal via `setOpen(false)`. State is reset (staffingRole, allocInput=100, etc.) before `onSuccess`. |

## 2. Form fields (in order)

| Field | Type | Validation | Required |
|---|---|---|---|
| Staffing Role | `<select>` of `STAFFING_ROLES` + `Other (custom)` | Non-empty after `.trim()` of effective role | Yes |
| Custom Role | `<input type="text">` (only when `staffingRole === '__custom__'`) | Non-empty | Yes (when shown) |
| Allocation % | `<input type="number" min=0 max=100>` | onBlur clamps to [0, 100] (via `parseInt`); submit-time validates `0 ≤ x ≤ 100` | Yes |
| Start Date | `<DatePicker required>` | Non-empty | Yes |
| End Date | `<DatePicker>` | If present, must be `>= startDate` | No |
| Note | `<textarea rows={2}>` | None | No |

`isDirty` flag = any of: `staffingRole !== '' || startDate !== '' || endDate !== '' || note !== '' || allocInput !== '100'`.

## 3. Read-only context grid (top of modal)

Two-column grid showing:
- **Person** (always; bold)
- **Project** (always; bold)
- **Evidence Hours** (only when `contextHours !== null`; bold, `${n}h`)
- **Evidence Date** (only when `contextDate` truthy; bold, `slice(0, 10)`)

## 4. Workload preview

`<WorkloadTimeline personId personStatus personTerminatedAt planned={...}>` rendered between context grid and form. The `planned` overlay is fed live from form state — `{ allocationPercent, endDate, projectName, startDate }`. Re-renders on every keystroke.

## 5. Inactive-person flow (the nested branch)

When `preFill.personStatus !== 'ACTIVE'` (e.g. `LEAVE`, `INACTIVE`, `TERMINATED`):

- Renders a yellow warning banner:
  - **Title**: `${preFill.personName} is currently ${personStatus.toLowerCase()}`
  - **Body**: "Evidence exists but the employee is no longer active. Choose a resolution:"
  - **Two radio options** (mutually exclusive):
    1. **Create HR case** (default; `inactiveOverride === false`)
    2. **Retroactive assignment** (`inactiveOverride === true`)

- **Footer changes based on radio**:
  - When **Create HR case** is selected (and inactive): replaces "Save Draft" + "Create & Request" buttons with a single **"Create HR Case"** primary button.
    - Click: calls `onCancel()` THEN navigates to `/cases/new?subjectPersonId=...&type=PERFORMANCE&note=...` via `window.location.href` (full reload). Note URL-encodes the auto-generated case description: "Reconciliation anomaly: evidence exists for ${personName} on ${projectName} but employee is ${personStatus}. Review evidence eligibility and resolve."
  - When **Retroactive assignment** is selected: footer reverts to standard "Save Draft" + "Override & Create" (label changes from "Create & Request" → "Override & Create"). Submit sends `personValidated: true` flag in the request payload.

## 6. UtilisationPeek

`<UtilisationPeek personId startDate endDate allocationPercent>` rendered after End Date row. Re-fetches as the user types dates / changes allocation.

## 7. Submission paths

There are **three** mutually exclusive submission paths:

| Path | Trigger | Payload includes |
|---|---|---|
| **Save Draft** | "Save Draft" button | `draft: true`, plus all standard fields |
| **Create & Request** (regular) | "Create & Request" / form submit | (no `draft`, no override flags), `personValidated: true` if inactiveOverride |
| **Override & Create** (inactive override) | Same button label changes when inactiveOverride radio is on | adds `personValidated: true` |

All three call `createAssignment(buildRequest(asDraft, forceOverlap))`. The `forceOverlap` flag is only set by the overlap-confirm flow (§9).

### 7.1 Submit-time validation

In order, sets `error` and returns:
1. `effectiveRole.trim() === ''` → `'Staffing role is required.'`
2. `allocationPercent < 0 || allocationPercent > 100` → `'Allocation must be 0–100%.'`
3. `!startDate` → `'Start date is required.'`
4. `endDate && endDate < startDate` → `'End date must be after start date.'`

## 8. Server error handling

After `createAssignment(...)` rejects:

- If `err.message.toLowerCase().includes('overlapping')` → opens the **Overlap confirmation** sub-dialog (§9). Stores `pendingDraft` so accept-overlap can resubmit with the same draft setting.
- Otherwise → sets `error = msg` (rendered above the form).

## 9. Overlap confirmation (nested confirm #1)

A second modal layer over the form modal. Pre-DS migration this was an absolutely-positioned overlay inside the modal panel. Post-migration it's a `<ConfirmDialog>` (separate Modal layer with shared stack management).

| Field | Value |
|---|---|
| Title | "Overlapping Assignment" |
| Body | "An assignment for this person and project already exists in this period. Overallocation will occur. Do you want to proceed?" |
| Cancel button | Closes the sub-dialog only (returns to form, no fields cleared) |
| Confirm button (label: "Accept Overlap") | Closes sub-dialog and resubmits with `forceOverlap=true` and the previously-pending `pendingDraft` flag |
| Accept Overlap button is disabled while `isSubmitting` | yes |

The `forceOverlap=true` payload adds: `allowOverlapOverride: true, overrideReason: 'Accepted overlap from reconciliation dashboard'`.

## 10. Discard-changes confirmation (nested confirm #2)

A second modal layer triggered when the user clicks Cancel / presses Escape / clicks backdrop while `isDirty`.

| Field | Value |
|---|---|
| Title | "Discard changes?" |
| Body | "You have unsaved changes. Are you sure you want to close?" |
| Keep editing button | Closes the sub-dialog (returns to form, untouched) |
| Discard button (variant=danger) | Calls `onCancel()` (closes form modal) |

## 11. Disabled / loading states

- Cancel button disabled while `isSubmitting`
- Save Draft / Create & Request disabled while `isSubmitting || !actorId`
- Submit button labels: "Saving..." (draft) / "Creating..." (regular) / "Override & Create" (inactive override) — preserve verbatim
- Accept Overlap disabled while `isSubmitting`

## 12. Side effects

| Interaction | API call |
|---|---|
| Successful submit | `POST /api/assignments` (via `createAssignment`) |
| Mount | `WorkloadTimeline` issues `GET /api/assignments?personId=...` (preloads); `UtilisationPeek` fetches utilisation data |
| Inactive + Create HR Case | Navigates to `/cases/new?subjectPersonId=...&type=PERFORMANCE&note=...` (full page reload via `window.location.href`) |
| All field changes | Pure local state — no API calls until submit |

## 13. Other notable behaviors

- The modal renders inside its caller's stacking context. With DS-2 migration it portals to `document.body` via the `<Modal>` shell.
- `actorId` comes from `useAuth().principal?.personId`. If null/empty, both submit buttons are disabled.
- **Outer/inner split** is required because `useAuth()` is called only inside the inner; defers context subscription to when the modal is actually open.
- Effective role: when `staffingRole === '__custom__'`, sends `customRole`; else sends `staffingRole`.
- Form reset on success: clears `staffingRole`, `customRole`, `allocInput=100`, `startDate=''`, `endDate=''`, `note=''` BEFORE calling `onSuccess`.

---

## Mapped regression spec

[`e2e/ux-regression/CreateAssignmentModal.spec.ts`](../../../e2e/ux-regression/CreateAssignmentModal.spec.ts) — covers smoke flows (open / dirty-guard / validation surfacing / cancel). Branches involving an inactive person, overlap-confirmation, and HR-case navigation are documented but not yet automated; the contract is the source of truth.
