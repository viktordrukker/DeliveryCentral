import { CreateProjectAssignmentService } from '@src/modules/assignments/application/create-project-assignment.service';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';

/**
 * F-91 / D-103-write-path round 1 — asserts that `createdByPersonId` on
 * the ProjectAssignment aggregate is populated from `command.actorId`
 * during creation. This is the unit-level half; the prisma persistence
 * half is covered by the existing create-project-assignment.spec.ts
 * which writes against a real DB.
 */
describe('D-103 write-path — ProjectAssignment createdByPersonId', () => {
  it('populates createdByPersonId from command.actorId on aggregate creation', async () => {
    const repo = new InMemoryProjectAssignmentRepository();
    const service = new CreateProjectAssignmentService(repo);

    const assignment = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 50,
      endDate: '2025-04-30T23:59:59.999Z',
      note: 'Primary delivery allocation.',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      startDate: '2025-03-15T00:00:00.000Z',
      staffingRole: 'Consultant',
    });

    expect(assignment.createdByPersonId).toBe('11111111-1111-1111-1111-111111111006');
    // requestedByPersonId is the same actorId in this flow but the column
    // semantics are distinct: requestedByPersonId tracks the PM who
    // demanded the slot; createdByPersonId tracks the system principal
    // who wrote the row. They diverge when an admin acts on a PM's behalf.
    expect(assignment.requestedByPersonId).toBe('11111111-1111-1111-1111-111111111006');
  });
});
