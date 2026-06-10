/**
 * F-130 / D-103-write-path round 40 — close residual write-path gaps to
 * reach >= 98% actor-audit coverage. This source-shape suite verifies that
 * each fixed call site stamps the canonical actor field on the Prisma
 * data {} object.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path round 40 — residual actor-audit (source-shape)', () => {
  it('admin-config.controller.createAccount: LocalAccount.create stamps both columns from req.principal', () => {
    const src = readFileSync('src/modules/admin/presentation/admin-config.controller.ts', 'utf-8');
    const section = src.slice(src.indexOf('public async createAccount'), src.indexOf('public async listAccounts'));
    expect(section).toMatch(/this\.prisma\.localAccount\.create/);
    expect(section).toMatch(/createdByPersonId:\s*actorPersonId/);
    expect(section).toMatch(/updatedByPersonId:\s*actorPersonId/);
  });

  it('admin-config.controller.updateAccount: LocalAccount.update stamps updatedByPersonId from req.principal', () => {
    const src = readFileSync('src/modules/admin/presentation/admin-config.controller.ts', 'utf-8');
    const section = src.slice(src.indexOf('public async updateAccount'), src.indexOf('public async deleteAccount'));
    expect(section).toMatch(/updatedByPersonId:\s*req\.principal\?\.personId\s*\?\?\s*null/);
  });

  it('decide-budget-change: tx.projectBudget.update on approve stamps updatedByPersonId', () => {
    const src = readFileSync(
      'src/modules/financial-governance/application/decide-budget-change.service.ts',
      'utf-8',
    );
    const section = src.slice(src.indexOf("decision === 'APPROVE'"), src.length);
    expect(section).toMatch(/tx\.projectBudget\.update/);
    expect(section).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });

  it('request-budget-change: autoApprove tx.projectBudget.update stamps updatedByPersonId', () => {
    const src = readFileSync(
      'src/modules/financial-governance/application/request-budget-change.service.ts',
      'utf-8',
    );
    const section = src.slice(src.indexOf('if (autoApprove)'), src.indexOf('return created;'));
    expect(section).toMatch(/tx\.projectBudget\.update/);
    expect(section).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });

  it('responsibility-rules-admin.create: ResponsibilityRule.create stamps both columns from actorId', () => {
    const src = readFileSync(
      'src/modules/identity-access/application/responsibility-rules-admin.service.ts',
      'utf-8',
    );
    const section = src.slice(src.indexOf('public async create('), src.indexOf('public async update('));
    expect(section).toMatch(/createdByPersonId:\s*actorId/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId/);
  });

  it('responsibility-rules-admin.update + archive: ResponsibilityRule.update stamps updatedByPersonId', () => {
    const src = readFileSync(
      'src/modules/identity-access/application/responsibility-rules-admin.service.ts',
      'utf-8',
    );
    const updateSection = src.slice(src.indexOf('public async update('), src.indexOf('public async archive('));
    const archiveSection = src.slice(src.indexOf('public async archive('), src.indexOf('private async requireRule'));
    expect(updateSection).toMatch(/updatedByPersonId:\s*actorId/);
    expect(archiveSection).toMatch(/updatedByPersonId:\s*actorId/);
  });

  it('PrismaTeamStore: ResourcePool.create + PersonResourcePoolMembership.create stamp actor from input/param', () => {
    const src = readFileSync(
      'src/modules/organization/infrastructure/repositories/prisma/prisma-team.store.ts',
      'utf-8',
    );
    expect(src).toMatch(/resourcePool\.create/);
    expect(src).toMatch(/createdByPersonId:\s*input\.actorId\s*\?\?\s*null/);
    expect(src).toMatch(/personResourcePoolMembership\.create/);
    expect(src).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    expect(src).toMatch(/personResourcePoolMembership\.update/);
    // updatedByPersonId is in the removeMember update data.
    const removeSection = src.slice(src.indexOf('public async removeMember'));
    expect(removeSection).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('apply-planner-scenario: tx.plannerScenario.update on archive stamps actorId', () => {
    const src = readFileSync(
      'src/modules/planner-scenarios/application/apply-planner-scenario.service.ts',
      'utf-8',
    );
    const section = src.slice(src.indexOf('tx.plannerScenario.update'));
    expect(section).toMatch(/updatedByPersonId:\s*actorId/);
  });

  it('planner-scenario.service.update + archive: PlannerScenario.update stamps updatedByPersonId from actorId', () => {
    const src = readFileSync(
      'src/modules/staffing-desk/application/planner-scenario.service.ts',
      'utf-8',
    );
    const updateSection = src.slice(src.indexOf('public async update('), src.indexOf('public async archive('));
    const archiveSection = src.slice(src.indexOf('public async archive('));
    expect(updateSection).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
    expect(archiveSection).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('monthly-timesheet.autoFill + copyPrevious: TimesheetEntry.upsert stamps both columns from personId', () => {
    const src = readFileSync(
      'src/modules/timesheets/application/monthly-timesheet.service.ts',
      'utf-8',
    );
    // Both upserts must include createdByPersonId + updatedByPersonId on create branch.
    const matches = src.match(/timesheetEntry\.upsert/g);
    expect(matches?.length).toBe(2);
    const both = src.split('timesheetEntry.upsert');
    // Slices 1 and 2 are the bodies after each `upsert(`.
    for (const part of [both[1], both[2]]) {
      expect(part).toMatch(/createdByPersonId:\s*personId/);
      expect(part).toMatch(/updatedByPersonId:\s*personId/);
    }
  });

  // SoT PR 16b — the assignments module was deleted along with the legacy
  // StaffingRequest aggregate. The previous assertion that
  // `transition-project-assignment.syncParentSrHeadcount` stamps
  // `updatedByPersonId` is no longer applicable because both the source
  // file and the column it touched have been removed.
});
