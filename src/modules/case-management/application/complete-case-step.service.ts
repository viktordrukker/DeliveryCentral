import { Injectable } from '@nestjs/common';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface CaseStepDto {
  assignedToPersonId: string | null;
  completedAt: string | null;
  displayName: string;
  dueAt: string | null;
  id: string;
  status: string;
  stepKey: string;
}

const STEP_TEMPLATES: Record<string, Array<{ displayName: string; stepKey: string }>> = {
  ONBOARDING: [
    { displayName: 'Provision System Access', stepKey: 'provision-access' },
    { displayName: 'Complete Paperwork', stepKey: 'complete-paperwork' },
    { displayName: 'Meet Your Manager', stepKey: 'meet-manager' },
    { displayName: 'First Day Check-in', stepKey: 'first-day-checkin' },
  ],
  OFFBOARDING: [
    { displayName: 'Exit Interview', stepKey: 'exit-interview' },
    { displayName: 'Revoke System Access', stepKey: 'revoke-access' },
    { displayName: 'Return Equipment', stepKey: 'return-equipment' },
    { displayName: 'Knowledge Transfer', stepKey: 'knowledge-transfer' },
    { displayName: 'Final Payroll Confirmation', stepKey: 'payroll-confirmation' },
  ],
  TRANSFER: [
    { displayName: 'Notify Current Manager', stepKey: 'notify-current-manager' },
    { displayName: 'Update Org Structure', stepKey: 'update-org-structure' },
    { displayName: 'Adjust Access Permissions', stepKey: 'adjust-access' },
    { displayName: 'Confirm Transfer Date', stepKey: 'confirm-transfer-date' },
  ],
  PERFORMANCE: [
    { displayName: 'Schedule Review Meeting', stepKey: 'schedule-meeting' },
    { displayName: 'Complete Self-Assessment', stepKey: 'self-assessment' },
    { displayName: 'Manager Assessment', stepKey: 'manager-assessment' },
    { displayName: 'Define Improvement Goals', stepKey: 'define-goals' },
    { displayName: 'Follow-up Check-in', stepKey: 'followup-checkin' },
  ],
};

@Injectable()
export class CompleteCaseStepService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  public async initializeSteps(caseId: string, caseTypeKey = 'ONBOARDING'): Promise<void> {
    const template = STEP_TEMPLATES[caseTypeKey] ?? STEP_TEMPLATES['ONBOARDING'];
    await this.prisma.caseStep.createMany({
      data: template.map((step) => ({
        caseRecordId: caseId,
        displayName: step.displayName,
        stepKey: step.stepKey,
        status: 'OPEN',
      })),
      skipDuplicates: true,
    });
  }

  public async execute(caseId: string, stepKey: string): Promise<CaseStepDto> {
    const existing = await this.prisma.caseStep.findUnique({
      where: { caseRecordId_stepKey: { caseRecordId: caseId, stepKey } },
    });

    if (!existing) {
      throw new Error('Case step not found.');
    }

    if (existing.status === 'COMPLETED') {
      throw new Error('Case step is already completed.');
    }

    const updated = await this.prisma.caseStep.update({
      data: {
        completedAt: new Date(),
        status: 'COMPLETED',
      },
      where: { caseRecordId_stepKey: { caseRecordId: caseId, stepKey } },
    });

    void this.prisma.caseRecord.findUnique({ where: { id: caseId }, select: { ownerPersonId: true } }).then((rec) => {
      void this.notificationEventTranslator?.caseStepCompleted({
        caseId,
        ownerPersonId: rec?.ownerPersonId,
      });
    });

    return {
      assignedToPersonId: updated.assignedToPersonId,
      completedAt: updated.completedAt?.toISOString() ?? null,
      displayName: updated.displayName,
      dueAt: updated.dueAt?.toISOString() ?? null,
      id: updated.id,
      status: updated.status,
      stepKey: updated.stepKey,
    };
  }

  public async addStep(caseId: string, displayName: string, stepKey?: string): Promise<CaseStepDto> {
    const key = stepKey ?? displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existing = await this.prisma.caseStep.findUnique({
      where: { caseRecordId_stepKey: { caseRecordId: caseId, stepKey: key } },
    });
    if (existing) {
      throw new Error(`Step with key '${key}' already exists.`);
    }
    const created = await this.prisma.caseStep.create({
      data: {
        caseRecordId: caseId,
        displayName,
        stepKey: key,
        status: 'OPEN',
      },
    });
    return {
      assignedToPersonId: created.assignedToPersonId,
      completedAt: created.completedAt?.toISOString() ?? null,
      displayName: created.displayName,
      dueAt: created.dueAt?.toISOString() ?? null,
      id: created.id,
      status: created.status,
      stepKey: created.stepKey,
    };
  }

  public async removeStep(caseId: string, stepKey: string): Promise<void> {
    const existing = await this.prisma.caseStep.findUnique({
      where: { caseRecordId_stepKey: { caseRecordId: caseId, stepKey } },
    });
    if (!existing) {
      throw new Error('Case step not found.');
    }
    await this.prisma.caseStep.delete({
      where: { caseRecordId_stepKey: { caseRecordId: caseId, stepKey } },
    });
  }

  public async listSteps(caseId: string): Promise<CaseStepDto[]> {
    const steps = await this.prisma.caseStep.findMany({
      orderBy: { createdAt: 'asc' },
      where: { caseRecordId: caseId },
    });

    return steps.map((step) => ({
      assignedToPersonId: step.assignedToPersonId,
      completedAt: step.completedAt?.toISOString() ?? null,
      displayName: step.displayName,
      dueAt: step.dueAt?.toISOString() ?? null,
      id: step.id,
      status: step.status,
      stepKey: step.stepKey,
    }));
  }
}
