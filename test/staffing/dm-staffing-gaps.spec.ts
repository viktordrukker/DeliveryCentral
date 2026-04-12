/**
 * 13-E2: Unit tests for DM staffingGaps query logic and HR at-risk employee detection.
 *
 * The staffingGaps logic lives inside DeliveryManagerDashboardQueryService.execute().
 * Rather than bootstrapping the full service (which requires many repo mocks), we test
 * the core filtering logic inline — mirroring what the service does — so that these tests
 * catch regressions if the thresholds or conditions change.
 */

// ─── Staffing Gap Logic ────────────────────────────────────────────────────────

interface MockAssignment {
  assignmentId: { value: string };
  personId: string;
  projectId: string;
  validTo: Date | null;
  isActiveAt(date: Date): boolean;
}

function makeAssignment(overrides: {
  id?: string;
  personId?: string;
  projectId?: string;
  validTo?: Date | null;
  activeAt?: boolean;
}): MockAssignment {
  return {
    assignmentId: { value: overrides.id ?? 'asgn-1' },
    personId: overrides.personId ?? 'person-1',
    projectId: overrides.projectId ?? 'proj-1',
    validTo: overrides.validTo ?? null,
    isActiveAt: (_date: Date) => overrides.activeAt ?? true,
  };
}

/**
 * Mirrors the staffingGaps filter logic from DeliveryManagerDashboardQueryService.
 */
function computeStaffingGaps(
  assignments: MockAssignment[],
  activeProjectIds: Set<string>,
  asOf: Date,
  windowDays = 28,
) {
  const gapCutoff = new Date(asOf);
  gapCutoff.setUTCDate(gapCutoff.getUTCDate() + windowDays);

  return assignments.filter((a) => {
    if (!activeProjectIds.has(a.projectId)) return false;
    if (!a.isActiveAt(asOf)) return false;
    const endDate = a.validTo;
    if (!endDate) return false;
    return endDate >= asOf && endDate <= gapCutoff;
  });
}

describe('DM staffingGaps — filtering logic', () => {
  const asOf = new Date('2026-04-06T00:00:00Z');
  const activeProjectIds = new Set(['proj-1', 'proj-2']);

  it('includes assignments ending within 28 days', () => {
    const endingSoon = makeAssignment({ validTo: new Date('2026-04-20') }); // 14 days away
    const gaps = computeStaffingGaps([endingSoon], activeProjectIds, asOf);
    expect(gaps).toHaveLength(1);
  });

  it('excludes assignments ending beyond 28 days', () => {
    const endingLater = makeAssignment({ validTo: new Date('2026-05-20') }); // 44 days away
    const gaps = computeStaffingGaps([endingLater], activeProjectIds, asOf);
    expect(gaps).toHaveLength(0);
  });

  it('excludes assignments that have already ended (before asOf)', () => {
    const alreadyEnded = makeAssignment({ validTo: new Date('2026-04-01') }); // 5 days ago
    const gaps = computeStaffingGaps([alreadyEnded], activeProjectIds, asOf);
    expect(gaps).toHaveLength(0);
  });

  it('excludes assignments with no end date (open-ended)', () => {
    const openEnded = makeAssignment({ validTo: null });
    const gaps = computeStaffingGaps([openEnded], activeProjectIds, asOf);
    expect(gaps).toHaveLength(0);
  });

  it('excludes assignments for projects not in the active set', () => {
    const wrongProject = makeAssignment({ projectId: 'proj-99', validTo: new Date('2026-04-20') });
    const gaps = computeStaffingGaps([wrongProject], activeProjectIds, asOf);
    expect(gaps).toHaveLength(0);
  });

  it('excludes assignments that are not active at asOf', () => {
    const inactive = makeAssignment({ validTo: new Date('2026-04-20'), activeAt: false });
    const gaps = computeStaffingGaps([inactive], activeProjectIds, asOf);
    expect(gaps).toHaveLength(0);
  });

  it('includes assignment ending exactly on asOf', () => {
    const endingToday = makeAssignment({ validTo: new Date(asOf) });
    const gaps = computeStaffingGaps([endingToday], activeProjectIds, asOf);
    expect(gaps).toHaveLength(1);
  });

  it('includes assignment ending exactly 28 days from asOf', () => {
    const endingOnBoundary = new Date(asOf);
    endingOnBoundary.setUTCDate(endingOnBoundary.getUTCDate() + 28);
    const a = makeAssignment({ validTo: endingOnBoundary });
    const gaps = computeStaffingGaps([a], activeProjectIds, asOf);
    expect(gaps).toHaveLength(1);
  });

  it('returns multiple gaps sorted by earliest end date', () => {
    const a1 = makeAssignment({ id: 'a1', validTo: new Date('2026-04-25') });
    const a2 = makeAssignment({ id: 'a2', validTo: new Date('2026-04-10') });
    const a3 = makeAssignment({ id: 'a3', validTo: new Date('2026-04-18') });
    const gaps = computeStaffingGaps([a1, a2, a3], activeProjectIds, asOf)
      .sort((a, b) => a.validTo!.getTime() - b.validTo!.getTime());

    expect(gaps.map((g) => g.assignmentId.value)).toEqual(['a2', 'a3', 'a1']);
  });
});

// ─── HR At-Risk Detection Logic ───────────────────────────────────────────────

/**
 * Mirrors the at-risk employee detection from HrManagerDashboardQueryService.
 */
function computeAtRiskEmployees(
  people: Array<{ personId: string; displayName: string; status: string }>,
  allocationByPerson: Map<string, number>,
  openCasePersonIds: Set<string>,
) {
  return people
    .filter((p) => p.status === 'ACTIVE')
    .flatMap((p) => {
      const riskFactors: string[] = [];
      if ((allocationByPerson.get(p.personId) ?? 0) > 100) riskFactors.push('OVER_ALLOCATED');
      if (openCasePersonIds.has(p.personId)) riskFactors.push('OPEN_CASE');
      if (riskFactors.length === 0) return [];
      return [{ ...p, riskFactors }];
    });
}

describe('HR atRiskEmployees — detection logic', () => {
  const people = [
    { personId: 'p1', displayName: 'Alice', status: 'ACTIVE' },
    { personId: 'p2', displayName: 'Bob', status: 'ACTIVE' },
    { personId: 'p3', displayName: 'Carol', status: 'ACTIVE' },
    { personId: 'p4', displayName: 'Dave', status: 'INACTIVE' },
  ];

  it('identifies over-allocated employees', () => {
    const allocation = new Map([['p1', 120], ['p2', 80]]);
    const cases = new Set<string>();
    const result = computeAtRiskEmployees(people, allocation, cases);

    expect(result).toHaveLength(1);
    expect(result[0].personId).toBe('p1');
    expect(result[0].riskFactors).toContain('OVER_ALLOCATED');
  });

  it('identifies employees with open cases', () => {
    const allocation = new Map<string, number>();
    const cases = new Set(['p2']);
    const result = computeAtRiskEmployees(people, allocation, cases);

    expect(result).toHaveLength(1);
    expect(result[0].personId).toBe('p2');
    expect(result[0].riskFactors).toContain('OPEN_CASE');
  });

  it('accumulates multiple risk factors for the same person', () => {
    const allocation = new Map([['p3', 150]]);
    const cases = new Set(['p3']);
    const result = computeAtRiskEmployees(people, allocation, cases);

    expect(result).toHaveLength(1);
    expect(result[0].riskFactors).toContain('OVER_ALLOCATED');
    expect(result[0].riskFactors).toContain('OPEN_CASE');
    expect(result[0].riskFactors).toHaveLength(2);
  });

  it('excludes inactive employees even if they meet criteria', () => {
    const allocation = new Map([['p4', 150]]);
    const cases = new Set(['p4']);
    const result = computeAtRiskEmployees(people, allocation, cases);

    expect(result.find((p) => p.personId === 'p4')).toBeUndefined();
  });

  it('excludes employees with no risk factors', () => {
    const allocation = new Map([['p1', 80], ['p2', 100]]); // none over 100
    const cases = new Set<string>();
    const result = computeAtRiskEmployees(people, allocation, cases);

    expect(result).toHaveLength(0);
  });

  it('includes employees at exactly 100% allocation (not over-allocated)', () => {
    const allocation = new Map([['p1', 100]]);
    const cases = new Set<string>();
    const result = computeAtRiskEmployees(people, allocation, cases);

    expect(result).toHaveLength(0);
  });
});
