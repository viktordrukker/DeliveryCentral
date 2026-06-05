import { BadRequestException, NotImplementedException } from '@nestjs/common';

import { UnifiedApprovalQueueService } from '@src/modules/dashboard/application/unified-approval-queue.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';
import type { LeaveRequestsService } from '@src/modules/leave-requests/application/leave-requests.service';
import type { DecideBudgetChangeService } from '@src/modules/financial-governance/application/decide-budget-change.service';
import type { DecideProjectActivationService } from '@src/modules/project-registry/application/decide-project-activation.service';
import type { ApproveCaseService } from '@src/modules/case-management/application/approve-case.service';
import type { TimesheetsService } from '@src/modules/timesheets/application/timesheets.service';
import type { TransitionProjectPositionFillService } from '@src/modules/project-positions/application/transition-project-position-fill.service';

interface Spies {
  leaveApprove: jest.Mock;
  leaveReject: jest.Mock;
  budgetExecute: jest.Mock;
  activationExecute: jest.Mock;
  caseApprove: jest.Mock;
  caseReject: jest.Mock;
  timesheetApprove: jest.Mock;
  timesheetReject: jest.Mock;
  positionTransition: jest.Mock;
}

function buildService(): { svc: UnifiedApprovalQueueService; spies: Spies } {
  const reviewedAt = new Date('2026-06-01T10:00:00Z');
  const spies: Spies = {
    leaveApprove: jest.fn(async () => ({ id: 'lr-1', reviewedAt: reviewedAt.toISOString() })),
    leaveReject: jest.fn(async () => ({ id: 'lr-1', reviewedAt: reviewedAt.toISOString() })),
    budgetExecute: jest.fn(async () => ({
      approvalId: 'ba-1',
      decision: 'APPROVED' as const,
      budget: { projectId: 'p-1', fiscalYear: 2026, capexBudget: 1, opexBudget: 1 },
    })),
    activationExecute: jest.fn(async () => ({ approvalId: 'aa-1', project: {} })),
    caseApprove: jest.fn(async () => ({ id: 'c-1' })),
    caseReject: jest.fn(async () => ({ id: 'c-1' })),
    timesheetApprove: jest.fn(async () => ({ id: 'tw-1' })),
    timesheetReject: jest.fn(async () => ({ id: 'tw-1' })),
    positionTransition: jest.fn(async () => ({
      positionId: { value: 'pp-1' },
    })),
  };

  const leave = { approve: spies.leaveApprove, reject: spies.leaveReject } as unknown as LeaveRequestsService;
  const budget = { execute: spies.budgetExecute } as unknown as DecideBudgetChangeService;
  const activation = { execute: spies.activationExecute } as unknown as DecideProjectActivationService;
  const cases = { approve: spies.caseApprove, reject: spies.caseReject } as unknown as ApproveCaseService;
  const timesheets = {
    approveWeek: spies.timesheetApprove,
    rejectWeek: spies.timesheetReject,
  } as unknown as TimesheetsService;
  const positions = {
    execute: spies.positionTransition,
  } as unknown as TransitionProjectPositionFillService;
  const prisma = {} as PrismaService;

  return {
    svc: new UnifiedApprovalQueueService(prisma, leave, budget, activation, cases, timesheets, positions),
    spies,
  };
}

describe('UnifiedApprovalQueueService.decide (V2 §4)', () => {
  it('routes source=leave APPROVE → leaveSvc.approve(id, actorId, comment)', async () => {
    const { svc, spies } = buildService();
    const out = await svc.decide({
      approvalId: 'lr-1',
      source: 'leave',
      decision: 'APPROVE',
      actorId: 'actor-1',
      actorRoles: ['hr_manager'],
      comment: 'Looks good',
    });
    expect(spies.leaveApprove).toHaveBeenCalledWith('lr-1', 'actor-1', 'Looks good');
    expect(spies.leaveReject).not.toHaveBeenCalled();
    expect(out.source).toBe('leave');
    expect(out.decision).toBe('APPROVED');
    expect(out.decidedByPersonId).toBe('actor-1');
    expect(out.approvalId).toBe('lr-1');
  });

  it('routes source=leave REJECT → leaveSvc.reject', async () => {
    const { svc, spies } = buildService();
    await svc.decide({
      approvalId: 'lr-2',
      source: 'leave',
      decision: 'REJECT',
      actorId: 'actor-2',
      actorRoles: [],
      comment: 'No coverage',
    });
    expect(spies.leaveReject).toHaveBeenCalledWith('lr-2', 'actor-2', 'No coverage');
  });

  it('rejects budget REJECT without reason with BadRequest', async () => {
    const { svc, spies } = buildService();
    await expect(
      svc.decide({
        approvalId: 'ba-1',
        source: 'budget',
        decision: 'REJECT',
        actorId: 'actor-3',
        actorRoles: ['director'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(spies.budgetExecute).not.toHaveBeenCalled();
  });

  it('routes source=budget APPROVE through DecideBudgetChangeService.execute', async () => {
    const { svc, spies } = buildService();
    const out = await svc.decide({
      approvalId: 'ba-2',
      source: 'budget',
      decision: 'APPROVE',
      actorId: 'actor-4',
      actorRoles: ['director'],
    });
    expect(spies.budgetExecute).toHaveBeenCalledWith({
      actorId: 'actor-4',
      approvalId: 'ba-2',
      decision: 'APPROVE',
      reason: undefined,
    });
    expect(out.source).toBe('budget');
    expect(out.decision).toBe('APPROVED');
  });

  it('routes source=activation REJECT with reason through DecideProjectActivationService.execute', async () => {
    const { svc, spies } = buildService();
    await svc.decide({
      approvalId: 'project-x',
      source: 'activation',
      decision: 'REJECT',
      actorId: 'actor-5',
      actorRoles: ['director'],
      reason: 'Funding not approved',
    });
    expect(spies.activationExecute).toHaveBeenCalledWith({
      actorId: 'actor-5',
      projectId: 'project-x',
      decision: 'REJECT',
      reason: 'Funding not approved',
    });
  });

  it('routes source=case APPROVE through ApproveCaseService.approve', async () => {
    const { svc, spies } = buildService();
    await svc.decide({
      approvalId: 'case-1',
      source: 'case',
      decision: 'APPROVE',
      actorId: 'actor-6',
      actorRoles: ['hr_manager'],
    });
    expect(spies.caseApprove).toHaveBeenCalledWith({ caseId: 'case-1', actorId: 'actor-6' });
  });

  it('routes source=timesheet APPROVE → approveWeek(id, actorId, roles)', async () => {
    const { svc, spies } = buildService();
    await svc.decide({
      approvalId: 'tw-1',
      source: 'timesheet',
      decision: 'APPROVE',
      actorId: 'actor-7',
      actorRoles: ['project_manager'],
    });
    expect(spies.timesheetApprove).toHaveBeenCalledWith('tw-1', 'actor-7', ['project_manager']);
  });

  it('routes source=position-proposal APPROVE → transitionFill(PROPOSED → BOOKED)', async () => {
    const { svc, spies } = buildService();
    const out = await svc.decide({
      approvalId: 'pp-1',
      source: 'position-proposal',
      decision: 'APPROVE',
      actorId: 'actor-8',
      actorRoles: ['project_manager'],
      comment: 'Approved',
    });
    expect(spies.positionTransition).toHaveBeenCalledWith({
      positionId: 'pp-1',
      toStatus: 'BOOKED',
      actorId: 'actor-8',
      actorRoles: ['project_manager'],
      reason: 'Approved',
    });
    expect(out.source).toBe('position-proposal');
    expect(out.decision).toBe('APPROVED');
    expect(out.approvalId).toBe('pp-1');
  });

  it('routes source=position-proposal REJECT (with reason) → transitionFill(PROPOSED → OPEN)', async () => {
    const { svc, spies } = buildService();
    await svc.decide({
      approvalId: 'pp-2',
      source: 'position-proposal',
      decision: 'REJECT',
      actorId: 'actor-9',
      actorRoles: ['delivery_manager'],
      reason: 'Skill mismatch',
    });
    expect(spies.positionTransition).toHaveBeenCalledWith({
      positionId: 'pp-2',
      toStatus: 'OPEN',
      actorId: 'actor-9',
      actorRoles: ['delivery_manager'],
      reason: 'Skill mismatch',
    });
  });

  it('rejects position-proposal REJECT without reason with BadRequest', async () => {
    const { svc, spies } = buildService();
    await expect(
      svc.decide({
        approvalId: 'pp-3',
        source: 'position-proposal',
        decision: 'REJECT',
        actorId: 'actor-10',
        actorRoles: ['project_manager'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(spies.positionTransition).not.toHaveBeenCalled();
  });

  it('rejects source=skill-review with NotImplementedException (501)', async () => {
    const { svc, spies } = buildService();
    await expect(
      svc.decide({
        approvalId: 'sr-1',
        source: 'skill-review',
        decision: 'APPROVE',
        actorId: 'actor-11',
        actorRoles: ['hr_manager'],
      }),
    ).rejects.toBeInstanceOf(NotImplementedException);
    expect(spies.positionTransition).not.toHaveBeenCalled();
  });

  it('filters non-platform roles before forwarding to the position transition service', async () => {
    const { svc, spies } = buildService();
    await svc.decide({
      approvalId: 'pp-4',
      source: 'position-proposal',
      decision: 'APPROVE',
      actorId: 'actor-12',
      actorRoles: ['project_manager', 'not_a_real_role'],
    });
    const callArg = spies.positionTransition.mock.calls[0]![0];
    expect(callArg.actorRoles).toEqual(['project_manager']);
  });
});
