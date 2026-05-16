import { ProjectRiskService } from '@src/modules/project-registry/application/project-risk.service';
import type { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-11.6 / D-127 — assert ProjectRiskService consumes
 * project.risk.{defaultProbability,defaultImpact,criticalScoreThreshold}
 * from PlatformSettings with safe fallbacks.
 */

interface SettingsMap {
  [key: string]: unknown;
}

function buildPlatformSettings(map: SettingsMap): PlatformSettingsService {
  return {
    getRawValue: async (key: string): Promise<unknown> => map[key] ?? null,
  } as unknown as PlatformSettingsService;
}

async function probeNumberSetting(
  svc: ProjectRiskService,
  key: string,
  fallback: number,
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (svc as any).numberSetting(key, fallback);
}

describe('ProjectRiskService — D-127 PlatformSettings resolution', () => {
  it('falls back to legacy defaults when no PlatformSettings is wired', async () => {
    const svc = new ProjectRiskService({} as PrismaService);
    expect(await probeNumberSetting(svc, 'project.risk.defaultProbability', 3)).toBe(3);
    expect(await probeNumberSetting(svc, 'project.risk.defaultImpact', 3)).toBe(3);
    expect(await probeNumberSetting(svc, 'project.risk.criticalScoreThreshold', 15)).toBe(15);
  });

  it('reads admin-overridden values from PlatformSettings', async () => {
    const settings = buildPlatformSettings({
      'project.risk.defaultProbability': 2,
      'project.risk.defaultImpact': 4,
      'project.risk.criticalScoreThreshold': 20,
    });
    const svc = new ProjectRiskService({} as PrismaService, settings);
    expect(await probeNumberSetting(svc, 'project.risk.defaultProbability', 3)).toBe(2);
    expect(await probeNumberSetting(svc, 'project.risk.defaultImpact', 3)).toBe(4);
    expect(await probeNumberSetting(svc, 'project.risk.criticalScoreThreshold', 15)).toBe(20);
  });

  it('falls back per-key on wrong-type or missing values', async () => {
    const settings = buildPlatformSettings({
      'project.risk.defaultProbability': 'high',
      // defaultImpact omitted entirely
      'project.risk.criticalScoreThreshold': null,
    });
    const svc = new ProjectRiskService({} as PrismaService, settings);
    expect(await probeNumberSetting(svc, 'project.risk.defaultProbability', 3)).toBe(3);
    expect(await probeNumberSetting(svc, 'project.risk.defaultImpact', 3)).toBe(3);
    expect(await probeNumberSetting(svc, 'project.risk.criticalScoreThreshold', 15)).toBe(15);
  });
});
