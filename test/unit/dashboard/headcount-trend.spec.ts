import { BadRequestException } from '@nestjs/common';
import { HeadcountTrendService } from '@src/modules/dashboard/application/headcount-trend.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakePerson {
  hiredAt: Date | null;
  terminatedAt: Date | null;
  createdAt: Date;
}

function buildStub(people: FakePerson[]): PrismaService {
  const person = { findMany: async (_q: unknown) => people };
  return { person } as unknown as PrismaService;
}

describe('HeadcountTrendService (W2-08)', () => {
  it('returns one point per month for the trailing N months', async () => {
    const svc = new HeadcountTrendService(buildStub([]));
    const result = await svc.execute({ asOf: '2026-06-15T00:00:00.000Z', months: 6 });
    expect(result).toHaveLength(6);
    expect(result.map((p) => p.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
    ]);
  });

  it('counts a person when hiredAt <= month-end and terminatedAt is null', async () => {
    const svc = new HeadcountTrendService(
      buildStub([
        {
          hiredAt: new Date('2026-02-01T00:00:00.000Z'),
          terminatedAt: null,
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
        },
      ]),
    );
    const result = await svc.execute({ asOf: '2026-04-15T00:00:00.000Z', months: 3 });
    expect(result).toEqual([
      { month: '2026-02', count: 1 },
      { month: '2026-03', count: 1 },
      { month: '2026-04', count: 1 },
    ]);
  });

  it('excludes a person from months after terminatedAt', async () => {
    const svc = new HeadcountTrendService(
      buildStub([
        {
          hiredAt: new Date('2026-01-01T00:00:00.000Z'),
          terminatedAt: new Date('2026-03-10T00:00:00.000Z'),
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
    );
    const result = await svc.execute({ asOf: '2026-05-15T00:00:00.000Z', months: 5 });
    expect(result).toEqual([
      { month: '2026-01', count: 1 },
      { month: '2026-02', count: 1 },
      { month: '2026-03', count: 0 },
      { month: '2026-04', count: 0 },
      { month: '2026-05', count: 0 },
    ]);
  });

  it('falls back to createdAt when hiredAt is null', async () => {
    const svc = new HeadcountTrendService(
      buildStub([
        {
          hiredAt: null,
          terminatedAt: null,
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
        },
      ]),
    );
    const result = await svc.execute({ asOf: '2026-04-15T00:00:00.000Z', months: 3 });
    expect(result).toEqual([
      { month: '2026-02', count: 0 },
      { month: '2026-03', count: 1 },
      { month: '2026-04', count: 1 },
    ]);
  });

  it('defaults to 6 months', async () => {
    const svc = new HeadcountTrendService(buildStub([]));
    const result = await svc.execute({ asOf: '2026-06-15T00:00:00.000Z' });
    expect(result).toHaveLength(6);
  });

  it('rejects months out of range', async () => {
    const svc = new HeadcountTrendService(buildStub([]));
    await expect(svc.execute({ months: 0 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.execute({ months: 25 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid asOf', async () => {
    const svc = new HeadcountTrendService(buildStub([]));
    await expect(svc.execute({ asOf: 'not-a-date' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
