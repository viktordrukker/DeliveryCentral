import { StaffingSuggestionsService } from '@src/modules/staffing-requests/application/staffing-suggestions.service';
import type { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-11.3 / D-122 + D-123 — assert StaffingSuggestionsService scoring
 * weights come from PlatformSettings when provided, and fall back to
 * legacy hardcoded constants when the PlatformSettings dep is absent.
 *
 * The full suggest() flow is exercised by integration tests; this spec
 * is laser-focused on the settings-loading path so a regression that
 * silently reverts to the hardcoded constants fails at commit time.
 */

interface SettingsMap {
  [key: string]: unknown;
}

function buildPlatformSettingsStub(map: SettingsMap): PlatformSettingsService {
  return {
    getRawValue: async (key: string): Promise<unknown> => map[key] ?? null,
  } as unknown as PlatformSettingsService;
}

function buildPrismaStub(): PrismaService {
  return {
    skill: { findMany: async () => [] },
    personSkill: { findMany: async () => [] },
    person: { findMany: async () => [] },
    projectAssignment: { findMany: async () => [] },
  } as unknown as PrismaService;
}

interface ProbeWeights {
  importance: { niceToHave: number; preferred: number; required: number };
  proficiency: { exact: number; oneOff: number; twoOff: number; threeOrMoreOff: number };
  recentRoleWindowMonths: number;
  recencyModifier: number;
}

async function probeWeights(svc: StaffingSuggestionsService): Promise<ProbeWeights> {
  // loadWeights is private — call via reflection so tests are coupled to
  // the surface contract (the resolved weights), not to internal layout.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (svc as any).loadWeights();
}

describe('StaffingSuggestionsService — settings-driven weights', () => {
  it('falls back to legacy defaults when no PlatformSettingsService is wired', async () => {
    const svc = new StaffingSuggestionsService(buildPrismaStub());
    const w = await probeWeights(svc);
    expect(w.importance.niceToHave).toBe(0.5);
    expect(w.importance.preferred).toBe(1.0);
    expect(w.importance.required).toBe(2.0);
    expect(w.proficiency.exact).toBe(1.0);
    expect(w.proficiency.oneOff).toBe(0.6);
    expect(w.proficiency.twoOff).toBe(0.3);
    expect(w.proficiency.threeOrMoreOff).toBe(0);
    expect(w.recentRoleWindowMonths).toBe(12);
    expect(w.recencyModifier).toBe(1.2);
  });

  it('reads each setting from PlatformSettings when present', async () => {
    const settings = buildPlatformSettingsStub({
      'staffing.suggestion.skillWeights.niceToHave': 0.25,
      'staffing.suggestion.skillWeights.preferred': 1.5,
      'staffing.suggestion.skillWeights.required': 3.0,
      'staffing.suggestion.proficiencyScore.exact': 0.95,
      'staffing.suggestion.proficiencyScore.oneOff': 0.55,
      'staffing.suggestion.proficiencyScore.twoOff': 0.2,
      'staffing.suggestion.proficiencyScore.threeOrMoreOff': 0.05,
      'staffing.suggestion.recentRoleWindowMonths': 6,
      'staffing.suggestion.recencyModifier': 1.5,
    });

    const svc = new StaffingSuggestionsService(buildPrismaStub(), settings);
    const w = await probeWeights(svc);
    expect(w.importance.niceToHave).toBe(0.25);
    expect(w.importance.preferred).toBe(1.5);
    expect(w.importance.required).toBe(3.0);
    expect(w.proficiency.exact).toBe(0.95);
    expect(w.proficiency.oneOff).toBe(0.55);
    expect(w.proficiency.twoOff).toBe(0.2);
    expect(w.proficiency.threeOrMoreOff).toBe(0.05);
    expect(w.recentRoleWindowMonths).toBe(6);
    expect(w.recencyModifier).toBe(1.5);
  });

  it('uses the legacy default per-key when a setting is unset (mixed-override scenario)', async () => {
    const settings = buildPlatformSettingsStub({
      // Only override one knob — every other key should fall back.
      'staffing.suggestion.skillWeights.required': 5.0,
    });
    const svc = new StaffingSuggestionsService(buildPrismaStub(), settings);
    const w = await probeWeights(svc);
    expect(w.importance.required).toBe(5.0);
    expect(w.importance.niceToHave).toBe(0.5);
    expect(w.importance.preferred).toBe(1.0);
    expect(w.recentRoleWindowMonths).toBe(12);
  });

  it('falls back when a setting value has the wrong type', async () => {
    const settings = buildPlatformSettingsStub({
      'staffing.suggestion.skillWeights.required': 'not-a-number',
      'staffing.suggestion.recentRoleWindowMonths': null,
    });
    const svc = new StaffingSuggestionsService(buildPrismaStub(), settings);
    const w = await probeWeights(svc);
    expect(w.importance.required).toBe(2.0);
    expect(w.recentRoleWindowMonths).toBe(12);
  });
});
