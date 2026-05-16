import { Logger } from '@nestjs/common';

import { AssignmentSlaSweepService } from '@src/modules/assignments/application/assignment-sla-sweep.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-11.4 / D-124 — assert AssignmentSlaSweepService pre-breach
 * thresholds come from `assignment.sla.warningPercents` PlatformSetting
 * with safe fallbacks. Lightweight unit test against the private
 * `loadPreBreachLevels()` method.
 */

function buildPrismaStub(settingValue: unknown): PrismaService {
  return {
    platformSetting: {
      findUnique: async (args: { where: { key: string } }): Promise<{ value: unknown } | null> =>
        args.where.key === 'assignment.sla.warningPercents'
          ? { value: settingValue }
          : null,
    },
  } as unknown as PrismaService;
}

async function probeLevels(prisma: PrismaService): Promise<{ low: number; high: number }> {
  const svc = new AssignmentSlaSweepService(prisma);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (svc as any).loadPreBreachLevels();
}

describe('AssignmentSlaSweepService — settings-driven pre-breach thresholds', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  it('returns legacy defaults (0.5 / 0.75) when the setting row is missing', async () => {
    const levels = await probeLevels(buildPrismaStub(undefined));
    expect(levels).toEqual({ low: 0.5, high: 0.75 });
  });

  it('reads admin-configured percents from the array setting', async () => {
    const levels = await probeLevels(buildPrismaStub([30, 80]));
    expect(levels).toEqual({ low: 0.3, high: 0.8 });
  });

  it('swaps low/high when admin entered them out of order', async () => {
    const levels = await probeLevels(buildPrismaStub([80, 30]));
    expect(levels).toEqual({ low: 0.3, high: 0.8 });
  });

  it('falls back when array values are non-numeric or out of range', async () => {
    const levels = await probeLevels(buildPrismaStub(['x', 150]));
    expect(levels).toEqual({ low: 0.5, high: 0.75 });
  });

  it('falls back when the setting value is not an array', async () => {
    const levels = await probeLevels(buildPrismaStub({ low: 50, high: 75 }));
    expect(levels).toEqual({ low: 0.5, high: 0.75 });
  });

  it('falls back when prisma throws', async () => {
    const prisma = {
      platformSetting: {
        findUnique: async () => {
          throw new Error('db down');
        },
      },
    } as unknown as PrismaService;
    const levels = await probeLevels(prisma);
    expect(levels).toEqual({ low: 0.5, high: 0.75 });
  });
});
