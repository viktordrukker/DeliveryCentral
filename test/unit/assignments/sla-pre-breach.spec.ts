import { AssignmentSlaSweepService } from '@src/modules/assignments/application/assignment-sla-sweep.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeRow {
  id: string;
  slaStage: string | null;
  slaDueAt: Date | null;
  personId: string;
  projectId: string;
  requestedByPersonId: string | null;
  requestedAt: Date;
  slaBreachedAt: Date | null;
  slaWarnedAt50pct: Date | null;
  slaWarnedAt75pct: Date | null;
}

interface PreBreachCall {
  assignmentId: string;
  warnLevel: '50pct' | '75pct';
  slaStage: string;
  recipientPersonIds: readonly string[];
}

function buildStack(rows: FakeRow[]): {
  prisma: PrismaService;
  preBreachCalls: PreBreachCall[];
  breachedCalls: string[];
  rowsRef: FakeRow[];
} {
  const preBreachCalls: PreBreachCall[] = [];
  const breachedCalls: string[] = [];

  const projectAssignment = {
    findMany: async (args: {
      where: {
        slaDueAt?: { lt?: Date; gt?: Date };
        slaBreachedAt: null;
        slaStage: { not: null };
      };
      select?: unknown;
    }): Promise<FakeRow[]> => {
      return rows.filter((r) => {
        if (r.slaBreachedAt !== null) return false;
        if (r.slaStage === null) return false;
        if (args.where.slaDueAt?.lt !== undefined) {
          return r.slaDueAt !== null && r.slaDueAt < args.where.slaDueAt.lt;
        }
        if (args.where.slaDueAt?.gt !== undefined) {
          return r.slaDueAt !== null && r.slaDueAt > args.where.slaDueAt.gt;
        }
        return true;
      });
    },
    update: async (args: {
      where: { id: string };
      data: Partial<FakeRow>;
    }): Promise<FakeRow> => {
      const row = rows.find((r) => r.id === args.where.id);
      if (!row) throw new Error('row not found');
      Object.assign(row, args.data);
      if (args.data.slaBreachedAt) breachedCalls.push(row.id);
      return row;
    },
  };

  const prisma = { projectAssignment } as unknown as PrismaService;

  return { prisma, preBreachCalls, breachedCalls, rowsRef: rows };
}

function buildTranslator(preBreachCalls: PreBreachCall[]) {
  return {
    assignmentSlaPreBreach: async (payload: PreBreachCall): Promise<void> => {
      preBreachCalls.push(payload);
    },
    assignmentSlaBreached: async (): Promise<void> => undefined,
  };
}

const NOW = new Date('2026-05-04T12:00:00Z');

function row(props: Partial<FakeRow> & { id: string; slaDueAt: Date; requestedAt: Date }): FakeRow {
  return {
    slaStage: 'PROPOSAL',
    personId: 'p-1',
    projectId: 'pr-1',
    requestedByPersonId: 'rm-1',
    slaBreachedAt: null,
    slaWarnedAt50pct: null,
    slaWarnedAt75pct: null,
    ...props,
  };
}

describe('AssignmentSlaSweepService — HD-10 pre-breach warnings', () => {
  it('emits a 50% warning when elapsed-fraction crosses 0.5 (and 0.75 not yet)', async () => {
    // 60% elapsed: requested 6 hours ago, due in 4 hours.
    const requestedAt = new Date(NOW.getTime() - 6 * 60 * 60 * 1000);
    const slaDueAt = new Date(NOW.getTime() + 4 * 60 * 60 * 1000);
    const rows = [row({ id: 'a-50', requestedAt, slaDueAt })];

    const { prisma, preBreachCalls, rowsRef } = buildStack(rows);
    const translator = buildTranslator(preBreachCalls);
    const svc = new AssignmentSlaSweepService(prisma, translator as never);

    const result = await svc.sweep(NOW);

    expect(result.warned50).toBe(1);
    expect(result.warned75).toBe(0);
    expect(preBreachCalls).toHaveLength(1);
    expect(preBreachCalls[0]).toMatchObject({ assignmentId: 'a-50', warnLevel: '50pct' });
    expect(rowsRef[0].slaWarnedAt50pct).toEqual(NOW);
    expect(rowsRef[0].slaWarnedAt75pct).toBeNull();
  });

  it('emits a 75% warning when elapsed-fraction crosses 0.75 and backfills the 50pct stamp', async () => {
    // 80% elapsed: requested 8 hours ago, due in 2 hours.
    const requestedAt = new Date(NOW.getTime() - 8 * 60 * 60 * 1000);
    const slaDueAt = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);
    const rows = [row({ id: 'a-75', requestedAt, slaDueAt })];

    const { prisma, preBreachCalls, rowsRef } = buildStack(rows);
    const translator = buildTranslator(preBreachCalls);
    const svc = new AssignmentSlaSweepService(prisma, translator as never);

    const result = await svc.sweep(NOW);

    expect(result.warned75).toBe(1);
    expect(result.warned50).toBe(0);
    expect(preBreachCalls).toHaveLength(1);
    expect(preBreachCalls[0]).toMatchObject({ warnLevel: '75pct' });
    // Backfill: 50pct timestamp should also be set so the next sweep can't re-fire it.
    expect(rowsRef[0].slaWarnedAt75pct).toEqual(NOW);
    expect(rowsRef[0].slaWarnedAt50pct).toEqual(NOW);
  });

  it('does NOT re-emit a 50% warning when slaWarnedAt50pct is already set', async () => {
    // 60% elapsed but already-warned at 50%.
    const requestedAt = new Date(NOW.getTime() - 6 * 60 * 60 * 1000);
    const slaDueAt = new Date(NOW.getTime() + 4 * 60 * 60 * 1000);
    const rows = [
      row({
        id: 'a-already',
        requestedAt,
        slaDueAt,
        slaWarnedAt50pct: new Date(NOW.getTime() - 30 * 60 * 1000),
      }),
    ];

    const { prisma, preBreachCalls } = buildStack(rows);
    const translator = buildTranslator(preBreachCalls);
    const svc = new AssignmentSlaSweepService(prisma, translator as never);

    const result = await svc.sweep(NOW);

    expect(result.warned50).toBe(0);
    expect(result.warned75).toBe(0);
    expect(preBreachCalls).toHaveLength(0);
  });

  it('progresses 50% → 75% across two sweeps', async () => {
    const requestedAt = new Date(NOW.getTime() - 6 * 60 * 60 * 1000);
    const slaDueAt = new Date(NOW.getTime() + 4 * 60 * 60 * 1000); // 60%
    const rows = [row({ id: 'a-progress', requestedAt, slaDueAt })];

    const { prisma, preBreachCalls } = buildStack(rows);
    const translator = buildTranslator(preBreachCalls);
    const svc = new AssignmentSlaSweepService(prisma, translator as never);

    // First sweep: 60% → 50% warning fires.
    let result = await svc.sweep(NOW);
    expect(result.warned50).toBe(1);
    expect(result.warned75).toBe(0);

    // Second sweep 4h later: 100% (would be a breach, but we adjust due time).
    // Move slaDueAt later so it's still in-progress at 80%.
    rows[0].slaDueAt = new Date(NOW.getTime() + 8 * 60 * 60 * 1000); // total 14h, elapsed 6h+2h=8h ⇒ ~57%
    // Adjust requestedAt so we land at 80%.
    rows[0].requestedAt = new Date(NOW.getTime() - 8 * 60 * 60 * 1000); // total 10h, elapsed at NOW+0: 80%
    rows[0].slaDueAt = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);

    result = await svc.sweep(NOW);
    expect(result.warned75).toBe(1);
    expect(result.warned50).toBe(0); // no re-emit
    expect(preBreachCalls).toHaveLength(2);
    expect(preBreachCalls[0].warnLevel).toBe('50pct');
    expect(preBreachCalls[1].warnLevel).toBe('75pct');
  });

  it('does NOT emit warnings for assignments that have already breached', async () => {
    // slaDueAt in the past + already-breached.
    const rows = [
      row({
        id: 'a-breached',
        requestedAt: new Date(NOW.getTime() - 10 * 60 * 60 * 1000),
        slaDueAt: new Date(NOW.getTime() - 1 * 60 * 60 * 1000),
        slaBreachedAt: new Date(NOW.getTime() - 50 * 60 * 1000),
      }),
    ];

    const { prisma, preBreachCalls } = buildStack(rows);
    const translator = buildTranslator(preBreachCalls);
    const svc = new AssignmentSlaSweepService(prisma, translator as never);

    const result = await svc.sweep(NOW);
    expect(result.warned50).toBe(0);
    expect(result.warned75).toBe(0);
    expect(preBreachCalls).toHaveLength(0);
  });

  it('does NOT emit warnings before the 50% threshold is crossed', async () => {
    // 30% elapsed: way below the 50% threshold.
    const requestedAt = new Date(NOW.getTime() - 3 * 60 * 60 * 1000);
    const slaDueAt = new Date(NOW.getTime() + 7 * 60 * 60 * 1000);
    const rows = [row({ id: 'a-early', requestedAt, slaDueAt })];

    const { prisma, preBreachCalls } = buildStack(rows);
    const translator = buildTranslator(preBreachCalls);
    const svc = new AssignmentSlaSweepService(prisma, translator as never);

    const result = await svc.sweep(NOW);
    expect(result.warned50).toBe(0);
    expect(result.warned75).toBe(0);
    expect(preBreachCalls).toHaveLength(0);
  });
});
