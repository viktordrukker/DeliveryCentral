import { ProjectClosureReadinessService } from '@src/modules/project-registry/application/project-closure-readiness.service';
import type { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-11.7 / D-129 — assert ProjectClosureReadinessService consumes
 * `project.closure.budgetVarianceThresholdPercent` with safe fallback.
 */

function buildPlatformSettings(value: unknown): PlatformSettingsService {
  return {
    getRawValue: async (key: string): Promise<unknown> =>
      key === 'project.closure.budgetVarianceThresholdPercent' ? value : null,
  } as unknown as PlatformSettingsService;
}

async function probeNumberSetting(svc: ProjectClosureReadinessService, fallback: number): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (svc as any).numberSetting('project.closure.budgetVarianceThresholdPercent', fallback);
}

describe('ProjectClosureReadinessService — D-129 PlatformSettings resolution', () => {
  it('falls back to legacy default (10) when no PlatformSettings is wired', async () => {
    const svc = new ProjectClosureReadinessService({} as PrismaService);
    expect(await probeNumberSetting(svc, 10)).toBe(10);
  });

  it('reads the admin-overridden threshold', async () => {
    const svc = new ProjectClosureReadinessService({} as PrismaService, buildPlatformSettings(25));
    expect(await probeNumberSetting(svc, 10)).toBe(25);
  });

  it('falls back when the setting value is the wrong type', async () => {
    const svc = new ProjectClosureReadinessService({} as PrismaService, buildPlatformSettings('high'));
    expect(await probeNumberSetting(svc, 10)).toBe(10);
  });

  it('falls back when the setting value is null', async () => {
    const svc = new ProjectClosureReadinessService({} as PrismaService, buildPlatformSettings(null));
    expect(await probeNumberSetting(svc, 10)).toBe(10);
  });
});
