/**
 * LEAN-P4c-1 — Onboarding-stage approval gate.
 *
 * Behavioural tests for the new gate service + integration with the
 * transition pipeline. Uses lightweight mocks for Prisma so the suite
 * stays in the `unit` bucket and does not touch the real DB.
 */
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';

import { OnboardingApprovalGateService } from '@src/modules/assignments/application/onboarding-approval-gate.service';
import { ApproveOnboardingService } from '@src/modules/assignments/application/approve-onboarding.service';

interface PositionRow {
  id: string;
  requiresOnboardingApproval: boolean;
  onboardingApprovedAt: Date | null;
  onboardingApprovedByPersonId: string | null;
}

function makePrismaStub(initial: PositionRow | null) {
  let row: PositionRow | null = initial ? { ...initial } : null;
  return {
    row(): PositionRow | null {
      return row;
    },
    projectPosition: {
      async findFirst(_args: unknown): Promise<PositionRow | null> {
        return row ? { ...row } : null;
      },
      async update(args: { where: { id: string }; data: Partial<PositionRow> }): Promise<PositionRow> {
        if (!row) throw new Error('no row');
        row = { ...row, ...(args.data as Partial<PositionRow>) };
        return { ...row };
      },
    },
  };
}

describe('LEAN-P4c-1 — OnboardingApprovalGateService', () => {
  const ASSIGNMENT_ID = '11111111-1111-1111-1111-111111111111';

  it('returns isApproved=true when no paired position exists', async () => {
    const prisma = makePrismaStub(null);
    const service = new OnboardingApprovalGateService(prisma as never);
    const state = await service.getState(ASSIGNMENT_ID);
    expect(state.requiresOnboardingApproval).toBe(false);
    expect(state.isApproved).toBe(true);
  });

  it('returns isApproved=true when gate is not required on the position', async () => {
    const prisma = makePrismaStub({
      id: 'pos-1',
      requiresOnboardingApproval: false,
      onboardingApprovedAt: null,
      onboardingApprovedByPersonId: null,
    });
    const service = new OnboardingApprovalGateService(prisma as never);
    const state = await service.getState(ASSIGNMENT_ID);
    expect(state.requiresOnboardingApproval).toBe(false);
    expect(state.isApproved).toBe(true);
  });

  it('returns isApproved=false when gate is required and not approved', async () => {
    const prisma = makePrismaStub({
      id: 'pos-1',
      requiresOnboardingApproval: true,
      onboardingApprovedAt: null,
      onboardingApprovedByPersonId: null,
    });
    const service = new OnboardingApprovalGateService(prisma as never);
    const state = await service.getState(ASSIGNMENT_ID);
    expect(state.requiresOnboardingApproval).toBe(true);
    expect(state.isApproved).toBe(false);
  });

  it('returns isApproved=true once onboardingApprovedAt is populated', async () => {
    const prisma = makePrismaStub({
      id: 'pos-1',
      requiresOnboardingApproval: true,
      onboardingApprovedAt: new Date('2026-06-01T12:00:00.000Z'),
      onboardingApprovedByPersonId: 'pm-1',
    });
    const service = new OnboardingApprovalGateService(prisma as never);
    const state = await service.getState(ASSIGNMENT_ID);
    expect(state.isApproved).toBe(true);
  });

  describe('assertTransitionAllowed', () => {
    it('is a no-op for non-ASSIGNED targets', async () => {
      const prisma = makePrismaStub({
        id: 'pos-1',
        requiresOnboardingApproval: true,
        onboardingApprovedAt: null,
        onboardingApprovedByPersonId: null,
      });
      const service = new OnboardingApprovalGateService(prisma as never);
      await expect(service.assertTransitionAllowed(ASSIGNMENT_ID, 'ONBOARDING')).resolves.toBeUndefined();
      await expect(service.assertTransitionAllowed(ASSIGNMENT_ID, 'ON_HOLD')).resolves.toBeUndefined();
      await expect(service.assertTransitionAllowed(ASSIGNMENT_ID, 'COMPLETED')).resolves.toBeUndefined();
    });

    it('throws ConflictException for ASSIGNED when gate not approved', async () => {
      const prisma = makePrismaStub({
        id: 'pos-1',
        requiresOnboardingApproval: true,
        onboardingApprovedAt: null,
        onboardingApprovedByPersonId: null,
      });
      const service = new OnboardingApprovalGateService(prisma as never);
      await expect(service.assertTransitionAllowed(ASSIGNMENT_ID, 'ASSIGNED')).rejects.toThrow(
        ConflictException,
      );
    });

    it('allows ASSIGNED when gate is required and approved', async () => {
      const prisma = makePrismaStub({
        id: 'pos-1',
        requiresOnboardingApproval: true,
        onboardingApprovedAt: new Date(),
        onboardingApprovedByPersonId: 'pm-1',
      });
      const service = new OnboardingApprovalGateService(prisma as never);
      await expect(service.assertTransitionAllowed(ASSIGNMENT_ID, 'ASSIGNED')).resolves.toBeUndefined();
    });

    it('allows ASSIGNED when gate is not required at all (default path)', async () => {
      const prisma = makePrismaStub({
        id: 'pos-1',
        requiresOnboardingApproval: false,
        onboardingApprovedAt: null,
        onboardingApprovedByPersonId: null,
      });
      const service = new OnboardingApprovalGateService(prisma as never);
      await expect(service.assertTransitionAllowed(ASSIGNMENT_ID, 'ASSIGNED')).resolves.toBeUndefined();
    });
  });
});

describe('LEAN-P4c-1 — ApproveOnboardingService', () => {
  const ASSIGNMENT_ID = '22222222-2222-2222-2222-222222222222';
  const PM_ID = 'pm-1';

  it('approve: throws BadRequestException when position does not require approval', async () => {
    const prisma = makePrismaStub({
      id: 'pos-1',
      requiresOnboardingApproval: false,
      onboardingApprovedAt: null,
      onboardingApprovedByPersonId: null,
    });
    const service = new ApproveOnboardingService(prisma as never);
    await expect(
      service.approve({ actorId: PM_ID, assignmentId: ASSIGNMENT_ID }),
    ).rejects.toThrow(BadRequestException);
  });

  it('approve: throws NotFoundException when no paired position exists', async () => {
    const prisma = makePrismaStub(null);
    const service = new ApproveOnboardingService(prisma as never);
    await expect(
      service.approve({ actorId: PM_ID, assignmentId: ASSIGNMENT_ID }),
    ).rejects.toThrow(NotFoundException);
  });

  it('approve: throws ConflictException when already approved', async () => {
    const prisma = makePrismaStub({
      id: 'pos-1',
      requiresOnboardingApproval: true,
      onboardingApprovedAt: new Date(),
      onboardingApprovedByPersonId: 'someone-else',
    });
    const service = new ApproveOnboardingService(prisma as never);
    await expect(
      service.approve({ actorId: PM_ID, assignmentId: ASSIGNMENT_ID }),
    ).rejects.toThrow(ConflictException);
  });

  it('approve: writes onboardingApprovedAt + onboardingApprovedByPersonId', async () => {
    const prisma = makePrismaStub({
      id: 'pos-1',
      requiresOnboardingApproval: true,
      onboardingApprovedAt: null,
      onboardingApprovedByPersonId: null,
    });
    const service = new ApproveOnboardingService(prisma as never);
    const result = await service.approve({ actorId: PM_ID, assignmentId: ASSIGNMENT_ID });
    expect(result.onboardingApprovedByPersonId).toBe(PM_ID);
    expect(result.onboardingApprovedAt).toBeTruthy();
    expect(prisma.row()?.onboardingApprovedAt).toBeInstanceOf(Date);
    expect(prisma.row()?.onboardingApprovedByPersonId).toBe(PM_ID);
  });

  it('reject: requires a non-empty reason', async () => {
    const prisma = makePrismaStub({
      id: 'pos-1',
      requiresOnboardingApproval: true,
      onboardingApprovedAt: null,
      onboardingApprovedByPersonId: null,
    });
    const service = new ApproveOnboardingService(prisma as never);
    await expect(
      service.reject({ actorId: PM_ID, assignmentId: ASSIGNMENT_ID, reason: '' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.reject({ actorId: PM_ID, assignmentId: ASSIGNMENT_ID, reason: '   ' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('reject: stores rejection reason on the position', async () => {
    const prisma = makePrismaStub({
      id: 'pos-1',
      requiresOnboardingApproval: true,
      onboardingApprovedAt: null,
      onboardingApprovedByPersonId: null,
    });
    const service = new ApproveOnboardingService(prisma as never);
    const result = await service.reject({
      actorId: PM_ID,
      assignmentId: ASSIGNMENT_ID,
      reason: 'Background check pending.',
    });
    expect(result.rejectionReason).toBe('Background check pending.');
  });

  it('reject: ConflictException once approved', async () => {
    const prisma = makePrismaStub({
      id: 'pos-1',
      requiresOnboardingApproval: true,
      onboardingApprovedAt: new Date(),
      onboardingApprovedByPersonId: 'pm-0',
    });
    const service = new ApproveOnboardingService(prisma as never);
    await expect(
      service.reject({ actorId: PM_ID, assignmentId: ASSIGNMENT_ID, reason: 'Late.' }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('LEAN-P4c-1 — source-shape integration', () => {
  it('TransitionProjectAssignmentService accepts OnboardingApprovalGateService and calls assertTransitionAllowed', () => {
    const src = require('node:fs').readFileSync(
      'src/modules/assignments/application/transition-project-assignment.service.ts',
      'utf-8',
    );
    expect(src).toMatch(/OnboardingApprovalGateService/);
    expect(src).toMatch(/onboardingGate\?:\s*OnboardingApprovalGateService/);
    expect(src).toMatch(/assertTransitionAllowed\(command\.assignmentId,\s*command\.target\)/);
  });

  it('assignments controller exposes /:id/onboarding/approve + /:id/onboarding/reject under PROJECT_DELIVERY_ROLES', () => {
    const src = require('node:fs').readFileSync(
      'src/modules/assignments/presentation/assignments.controller.ts',
      'utf-8',
    );
    expect(src).toMatch(/@Post\(':id\/onboarding\/approve'\)/);
    expect(src).toMatch(/@Post\(':id\/onboarding\/reject'\)/);
    // Both endpoints are gated to PROJECT_DELIVERY_ROLES.
    const approveBlock = src.slice(src.indexOf("':id/onboarding/approve'"), src.indexOf("':id/onboarding/reject'"));
    expect(approveBlock).toMatch(/PROJECT_DELIVERY_ROLES/);
    const rejectBlock = src.slice(src.indexOf("':id/onboarding/reject'"), src.indexOf(":id/assign'"));
    expect(rejectBlock).toMatch(/PROJECT_DELIVERY_ROLES/);
  });

  it('webhook-event-types registers onboarding_approved + onboarding_rejected', () => {
    const src = require('node:fs').readFileSync(
      'src/shared/events/webhook-event-types.ts',
      'utf-8',
    );
    expect(src).toMatch(/'assignment\.onboarding_approved'/);
    expect(src).toMatch(/'assignment\.onboarding_rejected'/);
  });
});
