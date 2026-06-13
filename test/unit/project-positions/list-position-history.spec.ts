import { NotFoundException } from '@nestjs/common';

import { ListPositionHistoryService } from '@src/modules/project-positions/application/list-position-history.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeHistoryRow {
  id: string;
  positionId: string;
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
  fillHistory: FakeHistoryRow[];
}

interface CapturedQuery {
  where?: unknown;
}

function buildStub(position: FakePosition | null, captured?: CapturedQuery): PrismaService {
  const projectPosition = {
    findUnique: async (q: { where?: unknown }): Promise<FakePosition | null> => {
      if (captured) captured.where = q.where;
      return position;
    },
  };
  return { projectPosition } as unknown as PrismaService;
}

function row(
  over: Partial<FakeHistoryRow> & Pick<FakeHistoryRow, 'id' | 'changeType' | 'occurredAt'>,
): FakeHistoryRow {
  return {
    positionId: 'pos-1',
    previousStatus: null,
    newStatus: null,
    previousPersonId: null,
    newPersonId: null,
    changedByPersonId: null,
    changeReason: null,
    ...over,
  };
}

describe('ListPositionHistoryService (W2-04)', () => {
  it('throws NotFound when the position does not exist', async () => {
    const svc = new ListPositionHistoryService(buildStub(null));
    await expect(svc.execute('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an empty history list when there are no fill-history rows', async () => {
    const svc = new ListPositionHistoryService(
      buildStub({ id: 'pos-1', fillHistory: [] }),
    );
    const result = await svc.execute('pos-1');
    expect(result).toEqual({ positionId: 'pos-1', history: [] });
  });

  it('serializes lean ProjectPositionFillHistory rows with ISO occurredAt', async () => {
    const svc = new ListPositionHistoryService(
      buildStub({
        id: 'pos-1',
        fillHistory: [
          row({
            id: 'h-1',
            changeType: 'OPENED',
            previousStatus: 'DRAFT',
            newStatus: 'OPEN',
            occurredAt: new Date('2026-06-01T00:00:00.000Z'),
            changedByPersonId: 'rm-1',
            changeReason: 'Project kicked off',
          }),
          row({
            id: 'h-2',
            changeType: 'PROPOSED',
            previousStatus: 'OPEN',
            newStatus: 'PROPOSED',
            previousPersonId: null,
            newPersonId: 'p-ada',
            occurredAt: new Date('2026-06-02T00:00:00.000Z'),
            changedByPersonId: 'rm-1',
          }),
        ],
      }),
    );

    const result = await svc.execute('pos-1');
    expect(result.positionId).toBe('pos-1');
    expect(result.history).toHaveLength(2);
    expect(result.history[0]).toEqual({
      id: 'h-1',
      positionId: 'pos-1',
      changeType: 'OPENED',
      previousStatus: 'DRAFT',
      newStatus: 'OPEN',
      previousPersonId: null,
      newPersonId: null,
      changedByPersonId: 'rm-1',
      changeReason: 'Project kicked off',
      occurredAt: '2026-06-01T00:00:00.000Z',
    });
    expect(result.history[1]!.newPersonId).toBe('p-ada');
    expect(result.history[1]!.occurredAt).toBe('2026-06-02T00:00:00.000Z');
  });

  // Regression: GET /:id/history 500'd when the path param was a `pos_…`
  // publicId because the service fed it straight into the uuid `id` column.
  // The handler's ParsePublicIdOrUuid pipe passes the value verbatim, so the
  // service must resolve the shape itself (mirrors PositionForensicsService).
  it('resolves a `pos_…` publicId via the publicId column (not the uuid id column)', async () => {
    const captured: CapturedQuery = {};
    const svc = new ListPositionHistoryService(
      buildStub(
        {
          id: '11111111-1111-1111-1111-111111111111',
          fillHistory: [
            row({
              id: 'h-1',
              changeType: 'OPENED',
              previousStatus: 'DRAFT',
              newStatus: 'OPEN',
              occurredAt: new Date('2026-06-01T00:00:00.000Z'),
            }),
          ],
        },
        captured,
      ),
    );

    const result = await svc.execute('pos_abcdefghij');

    expect(captured.where).toEqual({ publicId: 'pos_abcdefghij' });
    // The internal uuid is echoed back as positionId — not the publicId input.
    expect(result.positionId).toBe('11111111-1111-1111-1111-111111111111');
    expect(result.history).toHaveLength(1);
    expect(result.history[0]!.newStatus).toBe('OPEN');
  });

  it('resolves a raw uuid via the uuid id column', async () => {
    const captured: CapturedQuery = {};
    const svc = new ListPositionHistoryService(
      buildStub({ id: 'pos-1', fillHistory: [] }, captured),
    );

    await svc.execute('22222222-2222-2222-2222-222222222222');

    expect(captured.where).toEqual({ id: '22222222-2222-2222-2222-222222222222' });
  });
});
