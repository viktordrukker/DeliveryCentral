/**
 * F-113 / D-103-write-path round 23 — TimesheetWeek actor-audit.
 * Source-shape assertions across repository + service + monthly-service.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — TimesheetWeek actor-audit (source-shape)', () => {
  const repoSrc = readFileSync(
    'src/modules/timesheets/infrastructure/timesheet.repository.ts',
    'utf-8',
  );
  const serviceSrc = readFileSync(
    'src/modules/timesheets/application/timesheets.service.ts',
    'utf-8',
  );
  const monthlySrc = readFileSync(
    'src/modules/timesheets/application/monthly-timesheet.service.ts',
    'utf-8',
  );
  const controllerSrc = readFileSync(
    'src/modules/timesheets/presentation/timesheets.controller.ts',
    'utf-8',
  );

  it('repository createWeek: data block sets createdByPersonId + updatedByPersonId from actorId', () => {
    const section = repoSrc.slice(
      repoSrc.indexOf('public async createWeek'),
      repoSrc.indexOf('public async updateWeek'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('repository updateWeek: spreads data + sets updatedByPersonId from actorId', () => {
    const section = repoSrc.slice(
      repoSrc.indexOf('public async updateWeek'),
      repoSrc.indexOf('public async upsertEntry'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('service getMyWeek + upsertEntry: pass personId as actor on createWeek', () => {
    const getMyWeekSection = serviceSrc.slice(
      serviceSrc.indexOf('public async getMyWeek'),
      serviceSrc.indexOf('public async upsertEntry'),
    );
    expect(getMyWeekSection).toMatch(/createWeek\(personId,\s*weekDate,\s*personId\)/);
    const upsertEntrySection = serviceSrc.slice(
      serviceSrc.indexOf('public async upsertEntry'),
      serviceSrc.indexOf('public async renameRow'),
    );
    expect(upsertEntrySection).toMatch(/createWeek\(personId,\s*weekDate,\s*personId\)/);
  });

  it('service submitWeek + revokeWeek: pass personId as actor on updateWeek', () => {
    const submitSection = serviceSrc.slice(
      serviceSrc.indexOf('public async submitWeek'),
      serviceSrc.indexOf('public async revokeWeek'),
    );
    expect(submitSection).toMatch(/personId,\s*\);/);
    const revokeSection = serviceSrc.slice(
      serviceSrc.indexOf('public async revokeWeek'),
      serviceSrc.indexOf('public async resetWeek'),
    );
    expect(revokeSection).toMatch(/personId,\s*\);/);
  });

  it('service approveWeek: passes approverId as actor on updateWeek', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async approveWeek'),
      serviceSrc.indexOf('public async rejectWeek'),
    );
    expect(section).toMatch(/approverId,\s*\);/);
  });

  it('service rejectWeek: accepts optional rejecterId and threads it', () => {
    const section = serviceSrc.slice(serviceSrc.indexOf('public async rejectWeek'), serviceSrc.length);
    expect(section).toMatch(/rejecterId\?:\s*string/);
    expect(section).toMatch(/rejecterId,/);
  });

  it('controller rejectWeek: threads principal personId as rejecterId', () => {
    const section = controllerSrc.slice(
      controllerSrc.indexOf('public async rejectWeek'),
      controllerSrc.length,
    );
    expect(section).toMatch(/rejecterId\s*=\s*req\.principal\?\.personId/);
    expect(section).toMatch(/this\.service\.rejectWeek\(id,\s*dto,\s*rejecterId\)/);
  });

  it('monthly-service autoFill + copyPrevious: inline populate actor-audit cols on timesheetWeek.create', () => {
    expect(monthlySrc).toMatch(/createdByPersonId:\s*personId/);
    expect(monthlySrc).toMatch(/updatedByPersonId:\s*personId/);
    // Two distinct timesheetWeek.create insertion sites — F-130 round 40
    // also adds stamps to two timesheetEntry.upsert calls, so the broad
    // `createdByPersonId: personId` regex now matches 4 places overall.
    // The intent of this test is that BOTH week-create sites stamp; we
    // verify by checking each method's slice independently.
    const autoFillSection = monthlySrc.slice(
      monthlySrc.indexOf('public async autoFill'),
      monthlySrc.indexOf('public async copyPrevious'),
    );
    const copyPrevSection = monthlySrc.slice(
      monthlySrc.indexOf('public async copyPrevious'),
      monthlySrc.indexOf('private mondayOf'),
    );
    expect(autoFillSection).toMatch(/timesheetWeek\.create/);
    expect(autoFillSection).toMatch(/createdByPersonId:\s*personId/);
    expect(autoFillSection).toMatch(/updatedByPersonId:\s*personId/);
    expect(copyPrevSection).toMatch(/timesheetWeek\.create/);
    expect(copyPrevSection).toMatch(/createdByPersonId:\s*personId/);
    expect(copyPrevSection).toMatch(/updatedByPersonId:\s*personId/);
  });
});
