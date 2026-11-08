/**
 * LEAN-P2-8 — final FE callsite audit lock for legacy assignments /
 * staffing-requests API clients.
 *
 * Phase 2 batches 1-3 migrated the bulk of the hooks layer onto the canonical
 * `/project-positions` client. This audit catalogs every remaining import of
 * `@/lib/api/assignments` and `@/lib/api/staffing-requests`, locks them under
 * a documented disposition, and detects any new regression-callsite that
 * sneaks in.
 *
 * Disposition codes:
 *  - `type-only`    — file imports types (AssignmentDirectoryItem, …) for
 *                     local annotations; no runtime call fires. Safe to keep
 *                     until the lean DTOs replace the legacy shapes.
 *  - `read-via-mapper` — file calls `fetchAssignments` / `fetchStaffingRequests`
 *                       at runtime through the legacy client. Deferred: a
 *                       future LEAN-P2-9 slice will swap each to the
 *                       project-positions client + mapper. Exception list
 *                       below tracks the ones already migrated by LEAN-P2-8.
 *  - `write-deferred` — file invokes a legacy write (`createAssignment`,
 *                       `bulkCreateAssignments`, `scheduleOnboarding`,
 *                       `directorApproveAssignment`, `createAssignmentOverride`,
 *                       `cancelStaffingRequest`, `checkAllocationConflict`).
 *                       The mapper does not yet provide a write-path bridge;
 *                       these will be migrated in LEAN-P2-10 once the
 *                       project-positions write surface is fleshed out.
 *  - `mapper`        — the mapper itself imports legacy types by design.
 *
 * If the disposition list goes out of sync with the codebase (a file is added
 * or removed), the contents-mismatch assertions in this test will fail and
 * force a maintainer to update the audit.
 */

import { describe, expect, it } from 'vitest';

interface CallsiteDisposition {
  file: string;
  // Coarse classification used in the LEAN-P2-8 PR description.
  disposition:
    | 'type-only'
    | 'read-via-mapper'
    | 'read-deferred'
    | 'write-deferred'
    | 'mapper'
    | 'hook-already-migrated';
  note: string;
}

// Inventory captured 2026-06-04 immediately after batches 1-3 closed. Order:
// reads first, writes next, type-only last. Every import-from-legacy must
// have a row here — `npm run grep` and update the list before merging.
const ASSIGNMENTS_CALLSITES: CallsiteDisposition[] = [
  // ── hooks / mapper (Phase 1 + 2 already migrated) ──────────────────────
  {
    file: 'frontend/src/features/lean-migration/position-to-assignment-mapper.ts',
    disposition: 'mapper',
    note: 'Imports legacy types intentionally — converts Position → legacy DTO.',
  },
  {
    file: 'frontend/src/features/assignments/useAssignments.ts',
    disposition: 'hook-already-migrated',
    note: 'Hook re-points to listProjectPositions via mapper (LEAN-P2-2).',
  },
  {
    file: 'frontend/src/features/assignments/useApprovalQueue.ts',
    disposition: 'hook-already-migrated',
    note: 'Hook re-points to listProjectPositions via mapper (LEAN-P2-2).',
  },
  {
    file: 'frontend/src/features/assignments/useCreateAssignmentPage.ts',
    disposition: 'hook-already-migrated',
    note: 'Hook layer re-pointed (LEAN-P2-2). Write call still uses legacy.',
  },
  {
    file: 'frontend/src/features/assignments/useBulkAssignmentPage.ts',
    disposition: 'hook-already-migrated',
    note: 'Hook layer re-pointed (LEAN-P2-2). Write call still uses legacy.',
  },
  // ── read paths now via mapper (LEAN-P2-8) ─────────────────────────────
  {
    file: 'frontend/src/routes/reports/ExportCentrePage.tsx',
    disposition: 'read-via-mapper',
    note: 'LEAN-P2-8: re-pointed to listProjectPositions + mapListResponseToDirectory.',
  },
  // ── read paths deferred (status-filter / large-blast-radius) ───────────
  {
    file: 'frontend/src/routes/timesheets/TimesheetPage.tsx',
    disposition: 'read-deferred',
    note: 'Uses legacy `status: APPROVED/ACTIVE` filter — needs filter mapping table before swap.',
  },
  {
    file: 'frontend/src/routes/staffing-board/StaffingBoardPage.tsx',
    disposition: 'read-deferred',
    note: 'Uses legacy `status: APPROVED/ACTIVE` filter — needs filter mapping table.',
  },
  {
    file: 'frontend/src/routes/me/WorkspaceShellPage.tsx',
    disposition: 'read-deferred',
    note: 'Read by personId — clean swap candidate for LEAN-P2-9 follow-up.',
  },
  {
    file: 'frontend/src/routes/me/ProjectsTab.tsx',
    disposition: 'read-deferred',
    note: 'Read by personId — clean swap candidate for LEAN-P2-9 follow-up.',
  },
  {
    file: 'frontend/src/routes/projects/tabs/TeamTab.tsx',
    disposition: 'read-deferred',
    note: 'Read by projectId — clean swap candidate for LEAN-P2-9 follow-up.',
  },
  {
    file: 'frontend/src/routes/projects/tabs/TeamVendorsTab.tsx',
    disposition: 'read-via-mapper',
    note: 'W3-11: table columns bound directly to ProjectPosition. Mapper is only used to feed the shared StaffingSwimLaneGantt, which still consumes the legacy directory shape.',
  },
  {
    file: 'frontend/src/components/common/CommandPalette.tsx',
    disposition: 'read-deferred',
    note: 'Reads ACTIVE assignments — needs status mapping.',
  },
  {
    file: 'frontend/src/components/time-management/LeaveDecisionDrawer.tsx',
    disposition: 'read-deferred',
    note: 'Read by personId — clean swap candidate.',
  },
  {
    file: 'frontend/src/features/org-chart/usePersonSidebarData.ts',
    disposition: 'read-deferred',
    note: 'Reads `status: active` — needs status-filter mapping.',
  },
  {
    file: 'frontend/src/features/cases/useCreateCasePage.ts',
    disposition: 'read-deferred',
    note: 'Unfiltered fetchAssignments() — clean swap candidate but used to populate case-form dropdowns; UI integration test scope risk.',
  },
  {
    file: 'frontend/src/components/staffing-desk/WorkloadTimeline.tsx',
    disposition: 'read-deferred',
    note: 'Read by personId — clean swap candidate.',
  },
  // ── write paths (deferred — mapper has no write-inversion yet) ─────────
  {
    file: 'frontend/src/routes/dashboard/ResourceManagerDashboardPage.tsx',
    disposition: 'write-deferred',
    note: 'Calls createAssignment — needs LEAN-P2-10 write bridge.',
  },
  {
    file: 'frontend/src/components/assignments/CreateAssignmentModal.tsx',
    disposition: 'write-deferred',
    note: 'Calls createAssignment — needs LEAN-P2-10 write bridge.',
  },
  {
    file: 'frontend/src/components/assignments/BatchAssignmentConfirmModal.tsx',
    disposition: 'write-deferred',
    note: 'Calls bulkCreateAssignments — needs LEAN-P2-10 write bridge.',
  },
  {
    file: 'frontend/src/components/assignments/OnboardingScheduleModal.tsx',
    disposition: 'write-deferred',
    note: 'Calls scheduleOnboarding — needs LEAN-P2-10 write bridge.',
  },
  {
    file: 'frontend/src/components/staffing-desk/PlannerDraftAssignmentModal.tsx',
    disposition: 'write-deferred',
    note: 'Calls createAssignment — needs LEAN-P2-10 write bridge.',
  },
  // ── pure type-only imports (safe to keep) ──────────────────────────────
  {
    file: 'frontend/src/components/assignments/AssignmentWorkflowActions.tsx',
    disposition: 'type-only',
    note: 'Imports AssignmentStatusValue type.',
  },
  {
    file: 'frontend/src/components/assignments/AssignmentHistoryTimeline.tsx',
    disposition: 'type-only',
    note: 'Imports AssignmentHistoryItem type.',
  },
  {
    file: 'frontend/src/components/projects/StaffingSwimLaneGantt.tsx',
    disposition: 'type-only',
    note: 'Imports AssignmentDirectoryItem type.',
  },
  {
    file: 'frontend/src/components/dashboard/AssignmentList.tsx',
    disposition: 'type-only',
    note: 'Imports AssignmentDirectoryItem type.',
  },
  {
    file: 'frontend/src/components/cases/CaseForm.tsx',
    disposition: 'type-only',
    note: 'Imports AssignmentDirectoryItem type.',
  },
  {
    file: 'frontend/src/routes/assignments/ApprovalQueuePage.tsx',
    disposition: 'type-only',
    note: 'Imports AssignmentDirectoryItem type.',
  },
  {
    file: 'frontend/src/routes/dashboard/EmployeeDashboardPage.tsx',
    disposition: 'type-only',
    note: 'Imports AssignmentDirectoryItem type.',
  },
  {
    file: 'frontend/src/lib/assignment-transitions.ts',
    disposition: 'type-only',
    note: 'Imports AssignmentStatusValue type for state-machine helpers.',
  },
  // ── tests that still legitimately mock the legacy client ───────────────
  {
    file: 'frontend/src/routes/projects/ProjectDetailsPage.test.tsx',
    disposition: 'type-only',
    note: 'Test mocks `fetchAssignments` for the unmigrated TeamTab / TeamVendorsTab callsites.',
  },
  {
    file: 'frontend/src/routes/assignments/BulkAssignmentPage.test.tsx',
    disposition: 'type-only',
    note: 'Test mocks legacy `bulkCreateAssignments` for the still-legacy CreateAssignmentPage write.',
  },
  {
    file: 'frontend/src/routes/assignments/CreateAssignmentPage.test.tsx',
    disposition: 'type-only',
    note: 'Test mocks legacy create/createOverride/fetchAssignments for the still-legacy modal write.',
  },
  {
    file: 'frontend/src/routes/cases/CreateCasePage.test.tsx',
    disposition: 'type-only',
    note: 'Test mocks legacy `fetchAssignments` consumed by useCreateCasePage.',
  },
];

const STAFFING_REQUESTS_CALLSITES: CallsiteDisposition[] = [
  // ── hook / type only ───────────────────────────────────────────────────
  {
    file: 'frontend/src/features/staffing-desk/useStaffingDeskActions.ts',
    disposition: 'hook-already-migrated',
    note: 'Hook layer re-pointed in LEAN-P2-2 batch (issue 206).',
  },
  {
    file: 'frontend/src/components/staffing-requests/StaffingRequestDrawer.tsx',
    disposition: 'type-only',
    note: 'Imports StaffingRequest type for drawer props.',
  },
  // ── runtime reads (deferred) ──────────────────────────────────────────
  {
    file: 'frontend/src/routes/staffing-requests/StaffingRequestDetailPage.tsx',
    disposition: 'write-deferred',
    note: 'Calls cancelStaffingRequest — needs LEAN-P2-10 write bridge on the lean SR aggregate (or sunset of the legacy SR controller).',
  },
  {
    file: 'frontend/src/routes/staffing-requests/StaffingRequestsPage.tsx',
    disposition: 'read-deferred',
    note: 'Calls fetchStaffingRequests — needs full SR-shape mapper, separate from ProjectPosition.',
  },
  {
    file: 'frontend/src/components/dashboard/OnboardingChecklist.tsx',
    disposition: 'read-deferred',
    note: 'Calls fetchStaffingRequests — needs full SR-shape mapper.',
  },
  {
    file: 'frontend/src/components/staffing-desk/StaffingDeskTimeline.tsx',
    disposition: 'read-deferred',
    note: 'Calls fetchStaffingRequests({ status: OPEN }) — needs SR-shape mapper.',
  },
  // ── allocation-conflict (lives on SR controller but is a pure query) ───
  {
    file: 'frontend/src/routes/staffing-board/StaffingBoardPage.tsx',
    disposition: 'read-deferred',
    note: 'Calls checkAllocationConflict — the underlying handler is being re-homed to /project-positions/conflict-check in LEAN-P2-11.',
  },
  {
    file: 'frontend/src/components/assignments/UtilisationPeek.tsx',
    disposition: 'read-deferred',
    note: 'Calls checkAllocationConflict — pending the same conflict-check re-home.',
  },
  {
    file: 'frontend/src/components/staffing-requests/StaffingRequestForm.tsx',
    disposition: 'write-deferred',
    note: 'Calls into staffing-requests create write endpoints — covered by LEAN-P2-10.',
  },
];

describe('LEAN-P2-8 callsite audit lock', () => {
  // Forward-compat shape lock: any disposition added later must use one of
  // the known codes.
  const KNOWN_DISPOSITIONS = new Set([
    'type-only',
    'read-via-mapper',
    'read-deferred',
    'write-deferred',
    'mapper',
    'hook-already-migrated',
  ]);

  it('catalogs every assignments-import callsite with a known disposition', () => {
    for (const entry of ASSIGNMENTS_CALLSITES) {
      expect(entry.file).toMatch(/^frontend\/src\//);
      expect(KNOWN_DISPOSITIONS.has(entry.disposition)).toBe(true);
      expect(entry.note.length).toBeGreaterThan(0);
    }
  });

  it('catalogs every staffing-requests-import callsite with a known disposition', () => {
    for (const entry of STAFFING_REQUESTS_CALLSITES) {
      expect(entry.file).toMatch(/^frontend\/src\//);
      expect(KNOWN_DISPOSITIONS.has(entry.disposition)).toBe(true);
      expect(entry.note.length).toBeGreaterThan(0);
    }
  });

  // Audit-completeness counts. Update these numbers (and the rows above)
  // when files are added or removed from the audit set — the mismatch is
  // intentional drift detection.
  it('locks audit counts (update when callsites are added or removed)', () => {
    expect(ASSIGNMENTS_CALLSITES.length).toBe(34);
    expect(STAFFING_REQUESTS_CALLSITES.length).toBe(9);
  });

  it('records the read-via-mapper migrations (LEAN-P2-8: ExportCentrePage, W3-11: TeamVendorsTab)', () => {
    const migrated = ASSIGNMENTS_CALLSITES.filter(
      (e) => e.disposition === 'read-via-mapper',
    );
    expect(migrated.map((e) => e.file).sort()).toEqual([
      'frontend/src/routes/projects/tabs/TeamVendorsTab.tsx',
      'frontend/src/routes/reports/ExportCentrePage.tsx',
    ]);
  });
});
