/**
 * F-117 / D-103-write-path round 27 — PlatformSetting actor-audit.
 * Source-shape assertions across service + admin-feature-flags controller.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — PlatformSetting actor-audit (source-shape)', () => {
  const serviceSrc = readFileSync(
    'src/modules/platform-settings/application/platform-settings.service.ts',
    'utf-8',
  );
  const flagsControllerSrc = readFileSync(
    'src/modules/admin-feature-flags/feature-flags.controller.ts',
    'utf-8',
  );

  it('PlatformSettingsService.updateKey: upsert populates BOTH cols on create, updatedByPersonId on update', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async updateKey'),
      serviceSrc.length,
    );
    // Two update branches (upsert update path) + create branch.
    const upsertCall = section.slice(
      section.indexOf('platformSetting.upsert'),
      section.indexOf('this.auditLogger.record'),
    );
    expect(upsertCall).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    const updatedMatches = upsertCall.match(/updatedByPersonId:\s*actorId\s*\?\?\s*null/g);
    expect(updatedMatches?.length).toBe(2);
  });

  it('FeatureFlagsAdminController.update: resolves actor from @Req + populates cols on upsert', () => {
    expect(flagsControllerSrc).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    const updateSection = flagsControllerSrc.slice(
      flagsControllerSrc.indexOf('public async update'),
      flagsControllerSrc.length,
    );
    expect(updateSection).toMatch(/createdByPersonId:\s*actorId/);
    expect(updateSection).toMatch(/updatedByPersonId:\s*actorId/);
  });
});
