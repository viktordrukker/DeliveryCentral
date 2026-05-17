import { ProjectRiskService, cadenceDays } from '@src/modules/project-registry/application/project-risk.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-12.2 / D-128 — cadence-to-days dictionary-driven mapping.
 * Asserts ProjectRiskService.loadCadenceDays() consults the
 * `risk-review-cadence` MetadataDictionary entries with safe fallback
 * to the pure `cadenceDays()` helper.
 */

interface FakeEntry {
  entryKey: string;
  entryValue: string;
}

function buildPrismaStub(opts: {
  dictionaryExists?: boolean;
  entries?: FakeEntry[];
  throwOnDictionary?: boolean;
}): PrismaService {
  const { dictionaryExists = true, entries = [], throwOnDictionary = false } = opts;
  return {
    metadataDictionary: {
      findFirst: async (args: { where: { dictionaryKey: string } }): Promise<{ id: string } | null> => {
        if (throwOnDictionary) throw new Error('db down');
        if (args.where.dictionaryKey !== 'risk-review-cadence') return null;
        return dictionaryExists ? { id: 'dict-1' } : null;
      },
    },
    metadataEntry: {
      findMany: async (): Promise<FakeEntry[]> => entries,
    },
  } as unknown as PrismaService;
}

describe('ProjectRiskService.loadCadenceDays — F-12.2 / D-128', () => {
  it('returns the pure-helper fallback when the dictionary is missing', async () => {
    const svc = new ProjectRiskService(buildPrismaStub({ dictionaryExists: false }));
    const map = await svc.loadCadenceDays();
    expect(map).toEqual({
      WEEKLY: cadenceDays('WEEKLY'),
      FORTNIGHTLY: cadenceDays('FORTNIGHTLY'),
      MONTHLY: cadenceDays('MONTHLY'),
      QUARTERLY: cadenceDays('QUARTERLY'),
    });
  });

  it('returns the seeded defaults (matches the pure helper) when entries mirror the enum', async () => {
    const svc = new ProjectRiskService(
      buildPrismaStub({
        entries: [
          { entryKey: 'WEEKLY', entryValue: '7' },
          { entryKey: 'FORTNIGHTLY', entryValue: '14' },
          { entryKey: 'MONTHLY', entryValue: '30' },
          { entryKey: 'QUARTERLY', entryValue: '90' },
        ],
      }),
    );
    const map = await svc.loadCadenceDays();
    expect(map.WEEKLY).toBe(7);
    expect(map.FORTNIGHTLY).toBe(14);
    expect(map.MONTHLY).toBe(30);
    expect(map.QUARTERLY).toBe(90);
  });

  it('reads admin-overridden day counts from the dictionary', async () => {
    const svc = new ProjectRiskService(
      buildPrismaStub({
        entries: [
          { entryKey: 'WEEKLY', entryValue: '5' }, // tenant prefers a 5-day weekly cadence
          { entryKey: 'QUARTERLY', entryValue: '120' }, // and 4-month quarters
        ],
      }),
    );
    const map = await svc.loadCadenceDays();
    expect(map.WEEKLY).toBe(5);
    expect(map.QUARTERLY).toBe(120);
    // Untouched cadences fall back to pure-helper defaults
    expect(map.FORTNIGHTLY).toBe(14);
    expect(map.MONTHLY).toBe(30);
  });

  it('falls back per-cadence when entryValue is non-numeric or non-positive', async () => {
    const svc = new ProjectRiskService(
      buildPrismaStub({
        entries: [
          { entryKey: 'WEEKLY', entryValue: 'seven' },
          { entryKey: 'FORTNIGHTLY', entryValue: '-3' },
          { entryKey: 'MONTHLY', entryValue: '0' },
          { entryKey: 'QUARTERLY', entryValue: '90' },
        ],
      }),
    );
    const map = await svc.loadCadenceDays();
    expect(map.WEEKLY).toBe(7); // fallback
    expect(map.FORTNIGHTLY).toBe(14); // fallback (negative rejected)
    expect(map.MONTHLY).toBe(30); // fallback (zero rejected)
    expect(map.QUARTERLY).toBe(90); // override applied
  });

  it('ignores unknown entryKeys that do not match a RiskReviewCadence value', async () => {
    const svc = new ProjectRiskService(
      buildPrismaStub({
        entries: [
          { entryKey: 'SEMI_ANNUAL', entryValue: '180' }, // not a valid enum literal
          { entryKey: 'WEEKLY', entryValue: '7' },
        ],
      }),
    );
    const map = await svc.loadCadenceDays();
    expect(map).not.toHaveProperty('SEMI_ANNUAL');
    expect(map.WEEKLY).toBe(7);
  });

  it('falls back to the pure-helper map when Prisma throws', async () => {
    const svc = new ProjectRiskService(buildPrismaStub({ throwOnDictionary: true }));
    const map = await svc.loadCadenceDays();
    expect(map.WEEKLY).toBe(7);
    expect(map.QUARTERLY).toBe(90);
  });
});
