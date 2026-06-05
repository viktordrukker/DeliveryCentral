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
  const flagsAdminServiceSrc = readFileSync(
    'src/modules/admin-feature-flags/application/feature-flag-admin.service.ts',
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

  it('FeatureFlagsAdminController.update: resolves actor from @Req + delegates to service', () => {
    // LEAN-P4d-2 refactored the upsert into FeatureFlagAdminService.toggle.
    // The controller now resolves actorId from @Req and passes it through.
    expect(flagsControllerSrc).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
  });

  it('FeatureFlagAdminService.toggle: upsert populates BOTH cols on create, updatedByPersonId on update', () => {
    // LEAN-P4d-2 — actor-audit moved here from the controller. Source-shape
    // assertion ensures D-103 trail remains complete after the refactor.
    const section = flagsAdminServiceSrc.slice(
      flagsAdminServiceSrc.indexOf('public async toggle'),
      flagsAdminServiceSrc.length,
    );
    const upsertCall = section.slice(
      section.indexOf('platformSetting.upsert'),
      section.length,
    );
    expect(upsertCall).toMatch(/createdByPersonId:\s*actorId/);
    expect(upsertCall).toMatch(/updatedByPersonId:\s*actorId/);
  });
});
