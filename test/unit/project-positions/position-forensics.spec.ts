import { NotFoundException } from '@nestjs/common';

import { PositionForensicsService } from '@src/modules/project-positions/application/position-forensics.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeHistoryRow {
  id: string;
  changeType: string;
  previousStatus: string | null;
  newStatus: string | null;
  previousPersonId: string | null;
  newPersonId: string | null;
  changedByPersonId: string | null;
  changeReason: string | null;
  occurredAt: Date;
}

interface FakePosition {
  id: string;
  projectId: string;
  role: string;
  fillStatus: string;
  fillHistory: FakeHistoryRow[];
}

function buildStub(position: FakePosition | null): PrismaService {
  const projectPosition = {
    findUnique: async (_q: unknown): Promise<FakePosition | null> => position,
  };
  return { projectPosition } as unknown as PrismaService;
}

function row(over: Partial<FakeHistoryRow> & Pick<FakeHistoryRow, 'id' | 'changeType' | 'occurredAt'>): FakeHistoryRow {
  return {
    previousStatus: null,
    newStatus: null,
    previousPersonId: null,
    newPersonId: null,
    changedByPersonId: null,
    changeReason: null,
    ...over,
  };
}

const ONE_DAY = 86_400_000;

describe('PositionForensicsService', () => {
  it('throws NotFound when the position does not exist', async () => {
    const svc = new PositionForensicsService(buildStub(null));
    await expect(svc.execute('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the position header + empty events when history is empty', async () => {
    const svc = new PositionForensicsService(
      buildStub({
        id: 'pos-1',
        projectId: 'proj-1',
        role: 'Senior Engineer',
        fillStatus: 'DRAFT',
        fillHistory: [],
      }),
    );
    const now = new Date('2026-06-05T00:00:00.000Z');
    const result = await svc.execute('pos-1', now);
    expect(result).toEqual({
      positionId: 'pos-1',
      projectId: 'proj-1',
      role: 'Senior Engineer',
      currentStatus: 'DRAFT',
      events: [],
      asOf: '2026-06-05T00:00:00.000Z',
    });
  });

  it('computes dwell-time per event as the gap to the next event', async () => {
    const svc = new PositionForensicsService(
      buildStub({
        id: 'pos-2',
        projectId: 'proj-1',
        role: 'PM',
        fillStatus: 'PROPOSED',
        fillHistory: [
          row({
            id: 'h1',
            changeType: 'DRAFTED',
            previousStatus: null,
            newStatus: 'DRAFT',
            occurredAt: new Date('2026-06-01T00:00:00.000Z'),
          }),
          row({
            id: 'h2',
            changeType: 'OPENED',
            previousStatus: 'DRAFT',
            newStatus: 'OPEN',
            occurredAt: new Date('2026-06-02T00:00:00.000Z'),
          }),
          row({
            id: 'h3',
            changeType: 'PROPOSED',
            previousStatus: 'OPEN',
            newStatus: 'PROPOSED',
            occurredAt: new Date('2026-06-04T00:00:00.000Z'),
          }),
        ],
      }),
    );
    const now = new Date('2026-06-05T00:00:00.000Z');
    const result = await svc.execute('pos-2', now);
    // DRAFT → OPEN gap = 1d ; OPEN → PROPOSED gap = 2d ; latest PROPOSED dwell = 1d (asOf − occurredAt)
    expect(result.events.map((e) => e.dwellMs)).toEqual([ONE_DAY, 2 * ONE_DAY, ONE_DAY]);
  });

  it('uses asOf − occurredAt for the dwell on the most recent event', async () => {
    const svc = new PositionForensicsService(
      buildStub({
        id: 'pos-3',
        projectId: 'proj-1',
        role: 'BA',
        fillStatus: 'OPEN',
        fillHistory: [
          row({
            id: 'h1',
            changeType: 'OPENED',
            previousStatus: 'DRAFT',
            newStatus: 'OPEN',
            occurredAt: new Date('2026-06-04T00:00:00.000Z'),
          }),
        ],
      }),
    );
    const now = new Date('2026-06-09T00:00:00.000Z');
    const result = await svc.execute('pos-3', now);
    expect(result.events[0]!.dwellMs).toBe(5 * ONE_DAY);
    // OPEN @ 5d does not exceed the > 7d threshold
    expect(result.events[0]!.longDwell).toBe(false);
  });

  it('flags OPEN dwell > 7d as longDwell', async () => {
    const svc = new PositionForensicsService(
      buildStub({
        id: 'pos-4',
        projectId: 'proj-1',
        role: 'BA',
        fillStatus: 'OPEN',
        fillHistory: [
          row({
            id: 'h1',
            changeType: 'OPENED',
            previousStatus: 'DRAFT',
            newStatus: 'OPEN',
            occurredAt: new Date('2026-06-01T00:00:00.000Z'),
          }),
        ],
      }),
    );
    const now = new Date('2026-06-09T00:00:00.000Z'); // 8d > 7d
    const result = await svc.execute('pos-4', now);
    expect(result.events[0]!.dwellMs).toBe(8 * ONE_DAY);
    expect(result.events[0]!.longDwell).toBe(true);
  });

  it('flags PROPOSED dwell > 3d as longDwell', async () => {
    const svc = new PositionForensicsService(
      buildStub({
        id: 'pos-5',
        projectId: 'proj-1',
        role: 'BA',
        fillStatus: 'PROPOSED',
        fillHistory: [
          row({
            id: 'h1',
            changeType: 'PROPOSED',
            previousStatus: 'OPEN',
            newStatus: 'PROPOSED',
            occurredAt: new Date('2026-06-01T00:00:00.000Z'),
          }),
        ],
      }),
    );
    const now = new Date('2026-06-05T00:00:00.000Z'); // 4d > 3d
    const result = await svc.execute('pos-5', now);
    expect(result.events[0]!.longDwell).toBe(true);
  });

  it('does not flag other statuses (BOOKED / ASSIGNED) regardless of dwell', async () => {
    const svc = new PositionForensicsService(
      buildStub({
        id: 'pos-6',
        projectId: 'proj-1',
        role: 'BA',
        fillStatus: 'ASSIGNED',
        fillHistory: [
          row({
            id: 'h1',
            changeType: 'BOOKED',
            previousStatus: 'PROPOSED',
            newStatus: 'BOOKED',
            occurredAt: new Date('2026-05-01T00:00:00.000Z'),
          }),
          row({
            id: 'h2',
            changeType: 'ASSIGNED',
            previousStatus: 'BOOKED',
            newStatus: 'ASSIGNED',
            occurredAt: new Date('2026-05-30T00:00:00.000Z'),
          }),
        ],
      }),
    );
    const now = new Date('2026-06-30T00:00:00.000Z');
    const result = await svc.execute('pos-6', now);
    expect(result.events.every((e) => !e.longDwell)).toBe(true);
  });

  it('returns null dwellMs when newStatus is missing (e.g. metadata-only event)', async () => {
    const svc = new PositionForensicsService(
      buildStub({
        id: 'pos-7',
        projectId: 'proj-1',
        role: 'BA',
        fillStatus: 'OPEN',
        fillHistory: [
          row({
            id: 'h1',
            changeType: 'OPENED',
            previousStatus: 'DRAFT',
            newStatus: 'OPEN',
            occurredAt: new Date('2026-06-01T00:00:00.000Z'),
          }),
          row({
            id: 'h2',
            changeType: 'CANDIDATES_ADDED',
            previousStatus: null,
            newStatus: null, // metadata event — no status transition
            occurredAt: new Date('2026-06-02T00:00:00.000Z'),
          }),
        ],
      }),
    );
    const now = new Date('2026-06-03T00:00:00.000Z');
    const result = await svc.execute('pos-7', now);
    expect(result.events[1]!.dwellMs).toBeNull();
    expect(result.events[1]!.longDwell).toBe(false);
  });

  it('clamps negative dwell to 0 when occurredAt is in the future relative to asOf', async () => {
    const svc = new PositionForensicsService(
      buildStub({
        id: 'pos-8',
        projectId: 'proj-1',
        role: 'BA',
        fillStatus: 'OPEN',
        fillHistory: [
          row({
            id: 'h1',
            changeType: 'OPENED',
            previousStatus: 'DRAFT',
            newStatus: 'OPEN',
            occurredAt: new Date('2026-06-05T00:00:00.000Z'),
          }),
        ],
      }),
    );
    const now = new Date('2026-06-04T00:00:00.000Z');
    const result = await svc.execute('pos-8', now);
    expect(result.events[0]!.dwellMs).toBe(0);
  });

  it('surfaces actor + reason on each event', async () => {
    const svc = new PositionForensicsService(
      buildStub({
        id: 'pos-9',
        projectId: 'proj-1',
        role: 'BA',
        fillStatus: 'ON_HOLD',
        fillHistory: [
          row({
            id: 'h1',
            changeType: 'HELD',
            previousStatus: 'OPEN',
            newStatus: 'ON_HOLD',
            occurredAt: new Date('2026-06-01T00:00:00.000Z'),
            changedByPersonId: 'pm-1',
            changeReason: 'Awaiting client sign-off',
          }),
        ],
      }),
    );
    const now = new Date('2026-06-05T00:00:00.000Z');
    const result = await svc.execute('pos-9', now);
    expect(result.events[0]!.changedByPersonId).toBe('pm-1');
    expect(result.events[0]!.changeReason).toBe('Awaiting client sign-off');
  });

  it('emits events ordered by occurredAt ascending (relies on Prisma orderBy)', async () => {
    const svc = new PositionForensicsService(
      buildStub({
        id: 'pos-10',
        projectId: 'proj-1',
        role: 'BA',
        fillStatus: 'ASSIGNED',
        fillHistory: [
          row({ id: 'h1', changeType: 'OPENED', newStatus: 'OPEN', occurredAt: new Date('2026-06-01T00:00:00.000Z') }),
          row({ id: 'h2', changeType: 'PROPOSED', previousStatus: 'OPEN', newStatus: 'PROPOSED', occurredAt: new Date('2026-06-02T00:00:00.000Z') }),
          row({ id: 'h3', changeType: 'BOOKED', previousStatus: 'PROPOSED', newStatus: 'BOOKED', occurredAt: new Date('2026-06-03T00:00:00.000Z') }),
          row({ id: 'h4', changeType: 'ASSIGNED', previousStatus: 'BOOKED', newStatus: 'ASSIGNED', occurredAt: new Date('2026-06-04T00:00:00.000Z') }),
        ],
      }),
    );
    const now = new Date('2026-06-05T00:00:00.000Z');
    const result = await svc.execute('pos-10', now);
    expect(result.events.map((e) => e.id)).toEqual(['h1', 'h2', 'h3', 'h4']);
  });
});
