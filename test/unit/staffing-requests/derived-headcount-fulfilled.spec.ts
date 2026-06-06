/**
 * D-95 — derived `headcountFulfilled` source-shape assertions.
 *
 * Validates that the slate-pick + transition write paths both rely on a
 * LIVE count of project_assignments instead of the legacy `+1` increment
 * on the cached column. The cached counter was the root cause of BUG-SR-1
 * (cancelled SR rendered as Filled because the counter never decremented).
 */
import { readFileSync } from 'node:fs';

describe('D-95 — derived headcountFulfilled (source-shape)', () => {
  const slateSrc = readFileSync(
    'src/modules/staffing-requests/application/staffing-proposal-slate.service.ts',
    'utf-8',
  );
  const transitionSrc = readFileSync(
    'src/modules/assignments/application/transition-project-assignment.service.ts',
    'utf-8',
  );
  const deriveSrc = readFileSync(
    'src/modules/staffing-requests/application/derive-staffing-request-status.service.ts',
    'utf-8',
  );

  it('staffing-proposal-slate.pickCandidate counts live BOOKED+ONBOARDING+ASSIGNED+ON_HOLD+COMPLETED', () => {
    const section = slateSrc.slice(
      slateSrc.indexOf('public async pickCandidate'),
      slateSrc.indexOf('public async rejectAll'),
    );
    // Must call projectAssignment.count with the SR id + filled-status filter.
    expect(section).toMatch(/projectAssignment\.count/);
    expect(section).toMatch(
      /status:\s*\{\s*in:\s*\[\s*'BOOKED',\s*'ONBOARDING',\s*'ASSIGNED',\s*'ON_HOLD',\s*'COMPLETED'\s*\]/,
    );
    // Must NOT use the legacy +1 increment on the cached column.
    expect(section).not.toMatch(/request\.headcountFulfilled\s*\+\s*1/);
  });

  it('transition-project-assignment.execute syncs parent SR after every save', () => {
    expect(transitionSrc).toMatch(/syncParentSrHeadcount/);
    const section = transitionSrc.slice(
      transitionSrc.indexOf('private async syncParentSrHeadcount'),
      transitionSrc.indexOf('private async mirrorTransitionToProjectPosition'),
    );
    // LEAN-P1-7: derive-on-read from `ProjectPosition` against the paired
    // SR via `legacyStaffingRequestId`. RELEASED replaces COMPLETED in the
    // lean enum so the active filter drops COMPLETED.
    expect(section).toMatch(/projectPosition\.count/);
    expect(section).toMatch(/legacyStaffingRequestId/);
    expect(section).toMatch(
      /fillStatus:\s*\{\s*in:\s*\[\s*'BOOKED',\s*'ONBOARDING',\s*'ASSIGNED',\s*'ON_HOLD'\s*\]/,
    );
    expect(section).toMatch(/staffingRequest\.update/);
    expect(section).toMatch(/headcountFulfilled/);
  });

  it('transition-project-assignment.execute calls the recompute after repository.save', () => {
    const executeSection = transitionSrc.slice(
      transitionSrc.indexOf('public async execute'),
      transitionSrc.indexOf('pinRateCardOnBooked'),
    );
    expect(executeSection).toMatch(/syncParentSrHeadcount\(assignment\.staffingRequestId/);
    // Sync call must come AFTER the primary save so the count includes the
    // freshly-transitioned row.
    const saveIdx = executeSection.indexOf('projectAssignmentRepository.save');
    const syncIdx = executeSection.indexOf('syncParentSrHeadcount');
    expect(saveIdx).toBeGreaterThan(0);
    expect(syncIdx).toBeGreaterThan(saveIdx);
  });

  it('derive-staffing-request-status exposes recompute helper for explicit callers', () => {
    expect(deriveSrc).toMatch(/public async recomputeHeadcountFulfilled/);
    expect(deriveSrc).toMatch(/public async recomputeAndPersistHeadcount/);
    // The helpers must filter on the same filled-status set.
    expect(deriveSrc).toMatch(/'BOOKED',\s*'ONBOARDING',\s*'ASSIGNED',\s*'ON_HOLD',\s*'COMPLETED'/);
  });
});
