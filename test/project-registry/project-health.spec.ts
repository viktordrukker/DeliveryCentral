import { ProjectHealthQueryService } from '@src/modules/project-registry/application/project-health-query.service';

function makeProjectRepo(project: object | null) {
  return { findById: jest.fn().mockResolvedValue(project) };
}

function makeAssignmentRepo(assignments: object[] = []) {
  return { findAll: jest.fn().mockResolvedValue(assignments) };
}

function makePrisma(approvedEntryCount = 0) {
  return {
    timesheetEntry: {
      count: jest.fn().mockResolvedValue(approvedEntryCount),
    },
  };
}

function buildSvc(
  project: object | null,
  assignments: object[] = [],
  approvedEntryCount = 0,
): ProjectHealthQueryService {
  return new ProjectHealthQueryService(
    makeProjectRepo(project) as any,
    makeAssignmentRepo(assignments) as any,
    makePrisma(approvedEntryCount) as any,
  );
}

const FUTURE = new Date('2027-01-01T00:00:00Z');
const PAST = new Date('2025-01-01T00:00:00Z');

function makeProject(endsOn: Date | null = FUTURE) {
  return { id: 'proj-1', endsOn };
}

function makeAssignment(allocationPercent = 100) {
  return {
    projectId: 'proj-1',
    status: { value: 'APPROVED' },
    allocationPercent: { value: allocationPercent },
  };
}

describe('ProjectHealthQueryService', () => {
  it('returns null for unknown project', async () => {
    const svc = buildSvc(null);
    expect(await svc.execute('no-such-id')).toBeNull();
  });

  it('gives green grade (≥70) for staffed + approved time + future end date', async () => {
    const svc = buildSvc(
      makeProject(FUTURE),
      [makeAssignment(100)],
      6,
    );
    const result = await svc.execute('proj-1');
    expect(result).not.toBeNull();
    // staffing=33, time=33, timeline=34 → total=100
    expect(result!.score).toBe(100);
    expect(result!.grade).toBe('green');
    expect(result!.staffingScore).toBe(33);
    expect(result!.timeScore).toBe(33);
    expect(result!.timelineScore).toBe(34);
  });

  it('timeline score = 0 when project end date is in the past', async () => {
    const svc = buildSvc(makeProject(PAST), [makeAssignment(100)], 6);
    const result = await svc.execute('proj-1');
    expect(result!.timelineScore).toBe(0);
  });

  it('timeline score = 17 when project has no end date', async () => {
    const svc = buildSvc(makeProject(null), [makeAssignment(100)], 6);
    const result = await svc.execute('proj-1');
    expect(result!.timelineScore).toBe(17);
  });

  it('time score = 16 (partial) when assignments exist but no approved time exists yet', async () => {
    const svc = buildSvc(makeProject(FUTURE), [makeAssignment(100)], 0);
    const result = await svc.execute('proj-1');
    expect(result!.timeScore).toBe(16);
  });

  it('time score = 0 when no assignments and no approved time exist', async () => {
    const svc = buildSvc(makeProject(FUTURE), [], 0);
    const result = await svc.execute('proj-1');
    expect(result!.timeScore).toBe(0);
  });

  it('staffing score = 0 when no approved assignments', async () => {
    const svc = buildSvc(makeProject(FUTURE), [], 6);
    const result = await svc.execute('proj-1');
    expect(result!.staffingScore).toBe(0);
  });

  it('gives yellow grade for mid-range score (40–69)', async () => {
    // staffing=33, time=16, timeline=0 (past) → 49
    const svc = buildSvc(makeProject(PAST), [makeAssignment(100)], 0);
    const result = await svc.execute('proj-1');
    expect(result!.score).toBe(49);
    expect(result!.grade).toBe('yellow');
  });

  it('gives red grade for low score (<40)', async () => {
    // staffing=0, evidence=0, timeline=0 (past) → 0
    const svc = buildSvc(makeProject(PAST), [], 0);
    const result = await svc.execute('proj-1');
    expect(result!.score).toBe(0);
    expect(result!.grade).toBe('red');
  });
});
