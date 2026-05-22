/**
 * F-130 / D-103-write-path round 40 — CaseRecord update actor-audit.
 * Bundled PR covering:
 * - Entity props/getter/setUpdatedBy (mirrors F-118 + F-126 pattern)
 * - Repo save: both create + update branches
 * - 5 services (close/reopen/approve/reject/cancel/archive) thread actor
 * - Controller: 5 endpoints resolve actor from @Req()
 * - CreateCaseService: populates BOTH cols on first insert
 * - PrismaCaseCommentService: addComment stamps updatedByPersonId
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — CaseRecord updatedByPersonId (source-shape, bundled)', () => {
  const entitySrc = readFileSync(
    'src/modules/case-management/domain/entities/case-record.entity.ts',
    'utf-8',
  );
  const repoSrc = readFileSync(
    'src/modules/case-management/infrastructure/repositories/prisma/prisma-case-record.repository.ts',
    'utf-8',
  );
  const createSrc = readFileSync(
    'src/modules/case-management/application/create-case.service.ts',
    'utf-8',
  );
  const closeSrc = readFileSync(
    'src/modules/case-management/application/close-case.service.ts',
    'utf-8',
  );
  const reopenSrc = readFileSync(
    'src/modules/case-management/application/reopen-case.service.ts',
    'utf-8',
  );
  const approveSrc = readFileSync(
    'src/modules/case-management/application/approve-case.service.ts',
    'utf-8',
  );
  const cancelSrc = readFileSync(
    'src/modules/case-management/application/cancel-case.service.ts',
    'utf-8',
  );
  const archiveSrc = readFileSync(
    'src/modules/case-management/application/archive-case.service.ts',
    'utf-8',
  );
  const controllerSrc = readFileSync(
    'src/modules/case-management/presentation/cases.controller.ts',
    'utf-8',
  );
  const commentSrc = readFileSync(
    'src/modules/case-management/infrastructure/services/prisma-case-comment.service.ts',
    'utf-8',
  );

  it('entity: CaseRecordProps gains updatedByPersonId + getter + setUpdatedBy', () => {
    expect(entitySrc).toMatch(/updatedByPersonId\?:\s*string/);
    expect(entitySrc).toMatch(/public get updatedByPersonId\(\):\s*string\s*\|\s*undefined/);
    expect(entitySrc).toMatch(/public setUpdatedBy\(actorId:\s*string\s*\|\s*undefined\):\s*void/);
  });

  it('repository.save: both branches populate updatedByPersonId', () => {
    const upsertSection = repoSrc.slice(repoSrc.indexOf('caseRecord.upsert'), repoSrc.length);
    const createMatch = upsertSection.slice(0, upsertSection.indexOf('update:'));
    expect(createMatch).toMatch(/updatedByPersonId:\s*\n?\s*aggregate\.updatedByPersonId\s*\?\?\s*aggregate\.createdByPersonId\s*\?\?\s*null/);
    const updateMatch = upsertSection.slice(upsertSection.indexOf('update:'));
    expect(updateMatch).toMatch(/updatedByPersonId:\s*aggregate\.updatedByPersonId\s*\?\?\s*null/);
  });

  it('create service: CaseRecord.create populates BOTH cols from command.actorId', () => {
    const section = createSrc.slice(
      createSrc.indexOf('CaseRecord.create'),
      createSrc.indexOf('caseRecordRepository.save'),
    );
    expect(section).toMatch(/createdByPersonId:\s*command\.actorId/);
    expect(section).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });

  it('close service: accepts actorId + calls setUpdatedBy before save', () => {
    expect(closeSrc).toMatch(/public async execute\(caseId:\s*string,\s*actorId\?:\s*string\)/);
    const setIdx = closeSrc.indexOf('caseRecord.setUpdatedBy(actorId)');
    const saveIdx = closeSrc.indexOf('caseRecordRepository.save');
    expect(setIdx).toBeGreaterThan(0);
    expect(setIdx).toBeLessThan(saveIdx);
  });

  it('reopen service: accepts actorId + calls setUpdatedBy before save', () => {
    expect(reopenSrc).toMatch(/public async execute\(caseId:\s*string,\s*actorId\?:\s*string\)/);
    expect(reopenSrc).toMatch(/caseRecord\.setUpdatedBy\(actorId\)/);
  });

  it('approve service: both approve + reject call setUpdatedBy with command.actorId before save', () => {
    const approveSection = approveSrc.slice(
      approveSrc.indexOf('public async approve'),
      approveSrc.indexOf('public async reject'),
    );
    expect(approveSection).toMatch(/caseRecord\.setUpdatedBy\(command\.actorId\)/);
    const rejectSection = approveSrc.slice(approveSrc.indexOf('public async reject'), approveSrc.length);
    expect(rejectSection).toMatch(/caseRecord\.setUpdatedBy\(command\.actorId\)/);
  });

  it('cancel service: CancelCaseCommand gains actorId + setUpdatedBy called before save', () => {
    expect(cancelSrc).toMatch(/actorId\?:\s*string/);
    expect(cancelSrc).toMatch(/caseRecord\.setUpdatedBy\(command\.actorId\)/);
  });

  it('archive service: accepts actorId + calls setUpdatedBy before save', () => {
    expect(archiveSrc).toMatch(/public async execute\(caseId:\s*string,\s*actorId\?:\s*string\)/);
    expect(archiveSrc).toMatch(/caseRecord\.setUpdatedBy\(actorId\)/);
  });

  it('controller: closeCase/reopenCase/cancelCase/archiveCase resolve actor from @Req + thread to service', () => {
    expect(controllerSrc).toMatch(/this\.closeCaseService\.execute\(id,\s*actorId\)/);
    expect(controllerSrc).toMatch(/this\.reopenCaseService\.execute\(id,\s*actorId\)/);
    expect(controllerSrc).toMatch(/this\.cancelCaseService\.execute\(\{[^}]*actorId/);
    expect(controllerSrc).toMatch(/this\.archiveCaseService\.execute\(id,\s*actorId\)/);
  });

  it('comment service: addComment SR.update sets updatedByPersonId from authorPersonId', () => {
    const section = commentSrc.slice(
      commentSrc.indexOf('public async addComment'),
      commentSrc.indexOf('public async listComments'),
    );
    expect(section).toMatch(/this\.prisma\.caseRecord\.update/);
    expect(section).toMatch(/updatedByPersonId:\s*authorPersonId/);
  });
});
