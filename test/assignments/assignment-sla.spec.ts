import { AssignmentSlaService } from '@src/modules/assignments/application/assignment-sla.service';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';
import {
  AssignmentStatus,
  AssignmentStatusValue,
} from '@src/modules/assignments/domain/value-objects/assignment-status';

function buildAssignment(status: AssignmentStatusValue): ProjectAssignment {
  return ProjectAssignment.create(
    {
      allocationPercent: AllocationPercent.from(50),
      personId: '11111111-1111-1111-1111-111111111111',
      projectId: '22222222-2222-2222-2222-222222222222',
      requestedAt: new Date('2026-04-01T00:00:00.000Z'),
      staffingRole: 'Engineer',
      status: AssignmentStatus.from(status),
      validFrom: new Date('2026-04-15T00:00:00.000Z'),
    },
    AssignmentId.create(),
  );
}

function prismaStub(rows: { key: string; value: unknown }[]): { platformSetting: { findMany: jest.Mock } } {
  return {
    platformSetting: {
      findMany: jest.fn().mockResolvedValue(rows),
    },
  };
}

describe('AssignmentSlaService', () => {
  describe('applyTransition()', () => {
    it.each([
      ['CREATED', 'PROPOSAL'],
      ['PROPOSED', 'REVIEW'],
      ['IN_REVIEW', 'APPROVAL'],
      ['ONBOARDING', 'RM_FINALIZE'],
    ] as const)('maps %s status to the %s SLA stage', async (status, expectedStage) => {
      const service = new AssignmentSlaService(prismaStub([]) as never);
      const assignment = buildAssignment(status);
      await service.applyTransition(assignment, new Date('2026-04-29T09:00:00.000Z'));

      expect(assignment.slaStage).toBe(expectedStage);
      expect(assignment.slaDueAt).toBeInstanceOf(Date);
      expect(assignment.slaBreachedAt).toBeUndefined();
    });

    it.each(['BOOKED', 'ASSIGNED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'ON_HOLD'] as const)(
      'clears SLA fields for %s status (no SLA owed)',
      async (status) => {
        const service = new AssignmentSlaService(prismaStub([]) as never);
        const assignment = buildAssignment(status);
        await service.applyTransition(assignment);
        expect(assignment.slaStage).toBeUndefined();
        expect(assignment.slaDueAt).toBeUndefined();
        expect(assignment.slaBreachedAt).toBeUndefined();
      },
    );

    it('uses the configured PROPOSAL duration', async () => {
      const service = new AssignmentSlaService(
        prismaStub([{ key: 'assignment.sla.proposalDays', value: 5 }]) as never,
      );
      const assignment = buildAssignment('CREATED');
      // Start on Wed Apr 29, 2026; +5 business days = Wed May 6 (skips Sat May 2 + Sun May 3).
      const anchor = new Date('2026-04-29T09:00:00.000Z');
      await service.applyTransition(assignment, anchor);

      const due = assignment.slaDueAt!;
      // Day-of-week 0=Sun..6=Sat. May 6 = Wednesday.
      expect(due.getUTCDay()).toBe(3);
      const elapsedDays = (due.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000);
      // 5 business days plus the weekend in between = 7 calendar days.
      expect(elapsedDays).toBe(7);
    });

    it('rolls past weekends when computing the due date', async () => {
      const service = new AssignmentSlaService(
        prismaStub([{ key: 'assignment.sla.proposalDays', value: 1 }]) as never,
      );
      const assignment = buildAssignment('CREATED');
      // Anchor Friday May 1, 2026 (UTC). +1 business day = Monday May 4.
      const anchor = new Date('2026-05-01T09:00:00.000Z');
      await service.applyTransition(assignment, anchor);
      const due = assignment.slaDueAt!;
      expect(due.getUTCDay()).toBe(1); // Monday
    });

    it('snapshot() returns the configured durations with defaults preserved', async () => {
      const service = new AssignmentSlaService(
        prismaStub([{ key: 'assignment.sla.approvalDays', value: 7 }]) as never,
      );
      expect(await service.snapshot()).toEqual({
        proposalDays: 2,
        reviewDays: 1,
        approvalDays: 7,
        rmFinalizeDays: 1,
      });
    });
  });
});
