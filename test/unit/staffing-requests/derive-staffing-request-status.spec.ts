import {
  classifyFromSummary,
  type DerivedStaffingRequestSummary,
} from '@src/modules/staffing-requests/application/derive-staffing-request-status.service';

/**
 * BUG-SR-1 / Layer A — `classifyFromSummary` must honor the raw
 * `StaffingRequest.status` when it carries a terminal lifecycle signal
 * the assignment summary cannot infer.
 *
 * The original defect: a CANCELLED SR with zero assignments returned
 * `'Open'` because `totalAssignments === 0` short-circuited before
 * the raw status was consulted. The fix adds a `rawStatus` parameter
 * that wins ahead of the totalAssignments check.
 */
function emptySummary(): DerivedStaffingRequestSummary {
  return {
    assigned: 0,
    booked: 0,
    cancelled: 0,
    completed: 0,
    created: 0,
    onHold: 0,
    onboarding: 0,
    proposed: 0,
    rejected: 0,
    totalAssignments: 0,
  };
}

describe('classifyFromSummary — BUG-SR-1 raw-status honoring', () => {
  it('CANCELLED with zero assignments → Cancelled (was: Open)', () => {
    expect(classifyFromSummary(1, emptySummary(), 'CANCELLED')).toBe('Cancelled');
  });

  it('FULFILLED with zero assignments → Filled (defensive)', () => {
    expect(classifyFromSummary(1, emptySummary(), 'FULFILLED')).toBe('Filled');
  });

  it('CANCELLED with a booked assignment still wins → Cancelled', () => {
    const summary = emptySummary();
    summary.totalAssignments = 1;
    summary.booked = 1;
    expect(classifyFromSummary(1, summary, 'CANCELLED')).toBe('Cancelled');
  });

  it('DRAFT with zero assignments → Open (DRAFT does not override)', () => {
    expect(classifyFromSummary(1, emptySummary(), 'DRAFT')).toBe('Open');
  });

  it('OPEN with zero assignments → Open (legacy path)', () => {
    expect(classifyFromSummary(1, emptySummary(), 'OPEN')).toBe('Open');
  });

  it('rawStatus omitted preserves legacy behavior', () => {
    expect(classifyFromSummary(1, emptySummary())).toBe('Open');
  });

  it('rawStatus null preserves legacy behavior', () => {
    expect(classifyFromSummary(1, emptySummary(), null)).toBe('Open');
  });

  it('Filled via booked count still works when rawStatus=OPEN', () => {
    const summary = emptySummary();
    summary.totalAssignments = 2;
    summary.booked = 2;
    expect(classifyFromSummary(2, summary, 'OPEN')).toBe('Filled');
  });

  it('In progress when partially filled and rawStatus=IN_REVIEW', () => {
    const summary = emptySummary();
    summary.totalAssignments = 1;
    summary.proposed = 1;
    expect(classifyFromSummary(2, summary, 'IN_REVIEW')).toBe('In progress');
  });

  it('Closed via terminal-only assignments still derives correctly with OPEN status', () => {
    const summary = emptySummary();
    summary.totalAssignments = 2;
    summary.completed = 2;
    expect(classifyFromSummary(2, summary, 'OPEN')).toBe('Closed');
  });
});
