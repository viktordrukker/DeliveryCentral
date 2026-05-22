import { CreateCaseService } from '@src/modules/case-management/application/create-case.service';
import { InMemoryCaseRecordRepository } from '@src/modules/case-management/infrastructure/repositories/in-memory/in-memory-case-record.repository';

/**
 * F-93 / D-103-write-path round 3 — asserts that `createdByPersonId` on
 * a newly-created CaseRecord aggregate is populated from
 * `command.actorId` (the request-principal id threaded through by the
 * controller).
 */
describe('D-103 write-path — CaseRecord createdByPersonId', () => {
  it('populates createdByPersonId from command.actorId on aggregate creation', async () => {
    const repo = new InMemoryCaseRecordRepository();
    const svc = new CreateCaseService(repo);

    const caseRecord = await svc.execute({
      caseTypeKey: 'ONBOARDING',
      ownerPersonId: '11111111-1111-1111-1111-111111111006',
      subjectPersonId: '11111111-1111-1111-1111-111111111007',
      summary: 'New starter onboarding',
      // F-93 — the new field threaded by the controller from the request principal
      actorId: '22222222-2222-2222-2222-222222222999',
    });

    expect(caseRecord.createdByPersonId).toBe('22222222-2222-2222-2222-222222222999');
    expect(caseRecord.ownerPersonId).toBe('11111111-1111-1111-1111-111111111006');
    expect(caseRecord.subjectPersonId).toBe('11111111-1111-1111-1111-111111111007');
  });

  it('leaves createdByPersonId undefined when actorId is not supplied (legacy callers)', async () => {
    const repo = new InMemoryCaseRecordRepository();
    const svc = new CreateCaseService(repo);

    const caseRecord = await svc.execute({
      caseTypeKey: 'ONBOARDING',
      ownerPersonId: '11111111-1111-1111-1111-111111111006',
      subjectPersonId: '11111111-1111-1111-1111-111111111007',
    });

    expect(caseRecord.createdByPersonId).toBeUndefined();
  });
});
