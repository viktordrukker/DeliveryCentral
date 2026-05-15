import { FxRateService } from '@src/modules/financial-governance/application/fx-rate.service';
import type { PlatformFlagsService } from '@src/shared/config/platform-flags.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeRate {
  rate: number | string;
  asOf: Date;
}

function buildPrisma(table: Record<string, FakeRate[]>): PrismaService {
  return {
    fxRate: {
      findFirst: jest.fn(async (args: {
        where: { fromCurrency: string; toCurrency: string; asOf: { lte: Date } };
        orderBy?: unknown;
        select?: unknown;
      }): Promise<{ rate: number | string } | null> => {
        const key = `${args.where.fromCurrency}->${args.where.toCurrency}`;
        const rows = table[key] ?? [];
        const eligible = rows
          .filter((r) => r.asOf <= args.where.asOf.lte)
          .sort((a, b) => b.asOf.getTime() - a.asOf.getTime());
        return eligible.length > 0 ? { rate: eligible[0].rate } : null;
      }),
    },
  } as unknown as PrismaService;
}

function buildFlags(enabled: boolean): PlatformFlagsService {
  return {
    isEnabled: jest.fn(async () => enabled),
  } as unknown as PlatformFlagsService;
}

describe('FxRateService (F-7.4 / D-164)', () => {
  describe('getLatestRate', () => {
    it('returns 1 for same-currency lookups (short-circuit)', async () => {
      const svc = new FxRateService(buildPrisma({}), buildFlags(false));
      expect(await svc.getLatestRate('USD', 'USD')).toBe(1);
    });

    it('returns the most recent rate at or before asOf', async () => {
      const svc = new FxRateService(
        buildPrisma({
          'USD->GBP': [
            { rate: 0.78, asOf: new Date('2026-01-01') },
            { rate: 0.81, asOf: new Date('2026-03-01') },
            { rate: 0.79, asOf: new Date('2026-05-01') },
          ],
        }),
        buildFlags(false),
      );
      const rate = await svc.getLatestRate('USD', 'GBP', new Date('2026-04-15'));
      expect(rate).toBe(0.81);
    });

    it('returns null when no rate exists for the pair', async () => {
      const svc = new FxRateService(buildPrisma({}), buildFlags(false));
      const rate = await svc.getLatestRate('USD', 'AUD');
      expect(rate).toBeNull();
    });

    it('returns null when the DB query fails (degrades gracefully)', async () => {
      const prismaMock = {
        fxRate: { findFirst: jest.fn(async () => { throw new Error('db down'); }) },
      } as unknown as PrismaService;
      const svc = new FxRateService(prismaMock, buildFlags(false));
      const rate = await svc.getLatestRate('USD', 'GBP');
      expect(rate).toBeNull();
    });
  });

  describe('convert (flag OFF — single-currency tenant)', () => {
    it('returns amount unchanged when from===to', async () => {
      const svc = new FxRateService(buildPrisma({}), buildFlags(false));
      expect(await svc.convert(1000, 'USD', 'USD')).toBe(1000);
    });

    it('applies the rate when one is configured', async () => {
      const svc = new FxRateService(
        buildPrisma({ 'USD->GBP': [{ rate: 0.8, asOf: new Date('2026-01-01') }] }),
        buildFlags(false),
      );
      expect(await svc.convert(1000, 'USD', 'GBP')).toBe(800);
    });

    it('falls through to identity when no rate exists and flag OFF', async () => {
      const svc = new FxRateService(buildPrisma({}), buildFlags(false));
      const result = await svc.convert(1000, 'USD', 'AUD');
      expect(result).toBe(1000);
    });
  });

  describe('convert (flag ON — strict multi-currency)', () => {
    it('returns null when no rate exists and flag ON', async () => {
      const svc = new FxRateService(buildPrisma({}), buildFlags(true));
      const result = await svc.convert(1000, 'USD', 'AUD');
      expect(result).toBeNull();
    });

    it('still applies the rate when one is configured', async () => {
      const svc = new FxRateService(
        buildPrisma({ 'USD->GBP': [{ rate: 0.8, asOf: new Date('2026-01-01') }] }),
        buildFlags(true),
      );
      expect(await svc.convert(1000, 'USD', 'GBP')).toBe(800);
    });
  });
});
