import { TimeToFillService } from '@src/modules/project-registry/application/time-to-fill.service';

interface FillRow {
  changeType: string;
  occurredAt: Date;
}

interface PositionRow {
  id: string;
  role: string;
  fillStatus: string;
  fillHistory: FillRow[];
}

function buildSvc(positions: PositionRow[]): TimeToFillService {
  const prisma = {
    projectPosition: {
      findMany: jest.fn().mockResolvedValue(positions),
    },
  };
  return new TimeToFillService(prisma as any);
}

const PROJECT_ID = 'proj-1';

function pos(id: string, history: FillRow[], role = 'ENGINEER', fillStatus = 'BOOKED'): PositionRow {
  return { id, role, fillStatus, fillHistory: history };
}

function fill(changeType: string, daysFromEpoch: number): FillRow {
  return { changeType, occurredAt: new Date(daysFromEpoch * 86_400_000) };
}

describe('TimeToFillService', () => {
  it('returns empty metric when project has no positions', async () => {
    const svc = buildSvc([]);
    const result = await svc.execute(PROJECT_ID);
    expect(result).toEqual({
      projectId: PROJECT_ID,
      positionCount: 0,
      filledCount: 0,
      medianDays: null,
      positions: [],
    });
  });

  it('computes timeToFillDays for a position with OPENED and BOOKED', async () => {
    const svc = buildSvc([pos('p1', [fill('OPENED', 100), fill('BOOKED', 110)])]);
    const result = await svc.execute(PROJECT_ID);
    expect(result.positionCount).toBe(1);
    expect(result.filledCount).toBe(1);
    expect(result.positions[0].timeToFillDays).toBe(10);
    expect(result.medianDays).toBe(10);
  });

  it('falls back to DRAFTED as the open signal when no OPENED row exists', async () => {
    const svc = buildSvc([pos('p1', [fill('DRAFTED', 50), fill('BOOKED', 75)])]);
    const result = await svc.execute(PROJECT_ID);
    expect(result.positions[0].timeToFillDays).toBe(25);
  });

  it('falls back to ASSIGNED as the booked signal when no BOOKED row exists', async () => {
    const svc = buildSvc([pos('p1', [fill('OPENED', 0), fill('ASSIGNED', 7)])]);
    const result = await svc.execute(PROJECT_ID);
    expect(result.positions[0].timeToFillDays).toBe(7);
  });

  it('leaves timeToFillDays null when never booked', async () => {
    const svc = buildSvc([pos('p1', [fill('OPENED', 0)], 'PM', 'OPEN')]);
    const result = await svc.execute(PROJECT_ID);
    expect(result.filledCount).toBe(0);
    expect(result.positions[0].timeToFillDays).toBeNull();
    expect(result.medianDays).toBeNull();
  });

  it('leaves timeToFillDays null when never opened (booked-only history)', async () => {
    const svc = buildSvc([pos('p1', [fill('BOOKED', 5)])]);
    const result = await svc.execute(PROJECT_ID);
    expect(result.positions[0].timeToFillDays).toBeNull();
    expect(result.medianDays).toBeNull();
  });

  it('computes the median across an odd number of filled positions', async () => {
    const svc = buildSvc([
      pos('p1', [fill('OPENED', 0), fill('BOOKED', 2)]),
      pos('p2', [fill('OPENED', 0), fill('BOOKED', 7)]),
      pos('p3', [fill('OPENED', 0), fill('BOOKED', 30)]),
    ]);
    const result = await svc.execute(PROJECT_ID);
    expect(result.filledCount).toBe(3);
    expect(result.medianDays).toBe(7);
  });

  it('computes the median across an even number of filled positions', async () => {
    const svc = buildSvc([
      pos('p1', [fill('OPENED', 0), fill('BOOKED', 4)]),
      pos('p2', [fill('OPENED', 0), fill('BOOKED', 10)]),
    ]);
    const result = await svc.execute(PROJECT_ID);
    expect(result.medianDays).toBe(7);
  });

  it('ignores still-open positions when computing the median', async () => {
    const svc = buildSvc([
      pos('p1', [fill('OPENED', 0), fill('BOOKED', 5)]),
      pos('p2', [fill('OPENED', 0)], 'PM', 'OPEN'),
      pos('p3', [fill('OPENED', 0), fill('BOOKED', 15)]),
    ]);
    const result = await svc.execute(PROJECT_ID);
    expect(result.positionCount).toBe(3);
    expect(result.filledCount).toBe(2);
    expect(result.medianDays).toBe(10);
  });

  it('uses the earliest OPENED and earliest BOOKED entries when history has multiple cycles', async () => {
    const svc = buildSvc([
      pos('p1', [
        fill('OPENED', 10),
        fill('OPENED', 20),
        fill('BOOKED', 25),
        fill('BOOKED', 30),
      ]),
    ]);
    const result = await svc.execute(PROJECT_ID);
    // earliest OPENED=10, earliest BOOKED=25 → 15 days
    expect(result.positions[0].timeToFillDays).toBe(15);
  });
});
