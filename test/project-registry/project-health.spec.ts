import { ProjectHealthQueryService } from '@src/modules/project-registry/application/project-health-query.service';

function makeProjectRepo(project: object | null) {
  return { findById: jest.fn().mockResolvedValue(project) };
}

function makeAssignmentRepo(assignments: object[] = []) {
  return { findAll: jest.fn().mockResolvedValue(assignments) };
}

function makeEvidenceRepo(evidence: object[] = []) {
  return { list: jest.fn().mockResolvedValue(evidence) };
}

function buildSvc(
  project: object | null,
  assignments: object[] = [],
  evidence: object[] = [],
): ProjectHealthQueryService {
  return new ProjectHealthQueryService(
    makeProjectRepo(project) as any,
    makeAssignmentRepo(assignments) as any,
    makeEvidenceRepo(evidence) as any,
  );
}

const NOW = new Date('2026-04-06T12:00:00Z');
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

function makeEvidence(daysAgo = 5) {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return { occurredOn: d, recordedAt: d };
}

describe('ProjectHealthQueryService', () => {
  it('returns null for unknown project', async () => {
    const svc = buildSvc(null);
    expect(await svc.execute('no-such-id')).toBeNull();
  });

  it('gives green grade (≥70) for staffed + recent evidence + future end date', async () => {
    const svc = buildSvc(
      makeProject(FUTURE),
      [makeAssignment(100)],
      [makeEvidence(5)],
    );
    const result = await svc.execute('proj-1');
    expect(result).not.toBeNull();
    // staffing=33, evidence=33, timeline=34 → total=100
    expect(result!.score).toBe(100);
    expect(result!.grade).toBe('green');
    expect(result!.staffingScore).toBe(33);
    expect(result!.evidenceScore).toBe(33);
    expect(result!.timelineScore).toBe(34);
  });

  it('timeline score = 0 when project end date is in the past', async () => {
    const svc = buildSvc(makeProject(PAST), [makeAssignment(100)], [makeEvidence(5)]);
    const result = await svc.execute('proj-1');
    expect(result!.timelineScore).toBe(0);
  });

  it('timeline score = 17 when project has no end date', async () => {
    const svc = buildSvc(makeProject(null), [makeAssignment(100)], [makeEvidence(5)]);
    const result = await svc.execute('proj-1');
    expect(result!.timelineScore).toBe(17);
  });

  it('evidence score = 16 (partial) when all evidence is older than 30 days', async () => {
    const svc = buildSvc(makeProject(FUTURE), [makeAssignment(100)], [makeEvidence(35)]);
    const result = await svc.execute('proj-1');
    expect(result!.evidenceScore).toBe(16);
  });

  it('evidence score = 0 when no evidence at all', async () => {
    const svc = buildSvc(makeProject(FUTURE), [makeAssignment(100)], []);
    const result = await svc.execute('proj-1');
    expect(result!.evidenceScore).toBe(0);
  });

  it('staffing score = 0 when no approved assignments', async () => {
    const svc = buildSvc(makeProject(FUTURE), [], [makeEvidence(5)]);
    const result = await svc.execute('proj-1');
    expect(result!.staffingScore).toBe(0);
  });

  it('gives yellow grade for mid-range score (40–69)', async () => {
    // staffing=33, evidence=16 (old), timeline=0 (past) → 49
    const svc = buildSvc(makeProject(PAST), [makeAssignment(100)], [makeEvidence(35)]);
    const result = await svc.execute('proj-1');
    expect(result!.score).toBe(49);
    expect(result!.grade).toBe('yellow');
  });

  it('gives red grade for low score (<40)', async () => {
    // staffing=0, evidence=0, timeline=0 (past) → 0
    const svc = buildSvc(makeProject(PAST), [], []);
    const result = await svc.execute('proj-1');
    expect(result!.score).toBe(0);
    expect(result!.grade).toBe('red');
  });
});
