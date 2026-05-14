import { AuditRetentionSweepService } from '@src/modules/audit-observability/application/audit-retention-sweep.service';

describe('AuditRetentionSweepService (F-5.6 / D-168)', () => {
  function makeFixture(opts: {
    retentionDays?: number | string | null;
    deletedCount?: number;
  }) {
    const findUnique = jest.fn(async (args: { where: { key: string } }) => {
      if (args.where.key === 'audit.retentionDays') {
        return opts.retentionDays === null || opts.retentionDays === undefined
          ? null
          : { key: 'audit.retentionDays', value: opts.retentionDays };
      }
      return null;
    });
    const deleteMany = jest.fn(async () => ({ count: opts.deletedCount ?? 0 }));
    const prismaMock = {
      platformSetting: { findUnique },
      auditLog: { deleteMany },
    } as unknown as ConstructorParameters<typeof AuditRetentionSweepService>[0];

    return { svc: new AuditRetentionSweepService(prismaMock), findUnique, deleteMany };
  }

  it('uses 365-day default when setting is absent', async () => {
    const { svc, deleteMany } = makeFixture({ retentionDays: null, deletedCount: 5 });
    const now = new Date('2026-05-14T00:00:00Z');
    const result = await svc.sweep(now);

    expect(result.deleted).toBe(5);
    const expectedCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    expect(result.cutoff).toBe(expectedCutoff.toISOString());

    const calls = deleteMany.mock.calls as unknown as Array<[{ where: { createdAt: { lt: Date } } }]>;
    expect(calls[0][0].where.createdAt.lt.toISOString()).toBe(expectedCutoff.toISOString());
  });

  it('honors a custom retention from PlatformSetting (numeric value)', async () => {
    const { svc, deleteMany } = makeFixture({ retentionDays: 90, deletedCount: 42 });
    const now = new Date('2026-05-14T00:00:00Z');
    await svc.sweep(now);

    const expectedCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const calls = deleteMany.mock.calls as unknown as Array<[{ where: { createdAt: { lt: Date } } }]>;
    expect(calls[0][0].where.createdAt.lt.toISOString()).toBe(expectedCutoff.toISOString());
  });

  it('honors a custom retention from PlatformSetting (string value)', async () => {
    const { svc, deleteMany } = makeFixture({ retentionDays: '180', deletedCount: 0 });
    const now = new Date('2026-05-14T00:00:00Z');
    await svc.sweep(now);

    const expectedCutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const calls = deleteMany.mock.calls as unknown as Array<[{ where: { createdAt: { lt: Date } } }]>;
    expect(calls[0][0].where.createdAt.lt.toISOString()).toBe(expectedCutoff.toISOString());
  });

  it('clamps retention to a minimum of 1 day (never deletes the future)', async () => {
    const { svc, deleteMany } = makeFixture({ retentionDays: 0, deletedCount: 0 });
    const now = new Date('2026-05-14T00:00:00Z');
    await svc.sweep(now);

    const expectedCutoff = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const calls = deleteMany.mock.calls as unknown as Array<[{ where: { createdAt: { lt: Date } } }]>;
    expect(calls[0][0].where.createdAt.lt.toISOString()).toBe(expectedCutoff.toISOString());
  });

  it('returns the count from prisma.auditLog.deleteMany', async () => {
    const { svc } = makeFixture({ retentionDays: 365, deletedCount: 1234 });
    const result = await svc.sweep(new Date());
    expect(result.deleted).toBe(1234);
  });

  it('cutoff is monotonic — second sweep at later time uses later cutoff', async () => {
    const { svc } = makeFixture({ retentionDays: 365, deletedCount: 0 });
    const t1 = new Date('2026-05-14T00:00:00Z');
    const t2 = new Date('2026-05-15T00:00:00Z');
    const r1 = await svc.sweep(t1);
    const r2 = await svc.sweep(t2);
    expect(new Date(r2.cutoff).getTime()).toBeGreaterThan(new Date(r1.cutoff).getTime());
  });
});
