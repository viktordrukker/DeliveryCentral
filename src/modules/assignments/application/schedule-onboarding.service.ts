import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';

import { AssignmentSlaService } from './assignment-sla.service';
import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { AssignmentId } from '../domain/value-objects/assignment-id';

interface ScheduleOnboardingInput {
  actorId: string;
  actorRoles: readonly PlatformRole[];
  assignmentId: string;
  /** ISO date — when the person starts onboarding paperwork. Must be ≤ the assignment's start date (`validFrom`). */
  onboardingDate: string;
}

@Injectable()
export class ScheduleOnboardingService {
  public constructor(
    private readonly assignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    private readonly slaService?: AssignmentSlaService,
  ) {}

  public async execute(input: ScheduleOnboardingInput): Promise<ProjectAssignment> {
    const onboardingDate = this.parseDate(input.onboardingDate, 'onboardingDate');

    const assignment = await this.assignmentRepository.findByAssignmentId(
      AssignmentId.from(input.assignmentId),
    );
    if (!assignment) {
      throw new NotFoundException(`Assignment ${input.assignmentId} not found.`);
    }

    if (assignment.status.value !== 'BOOKED') {
      throw new ConflictException(
        `Onboarding can only be scheduled for BOOKED assignments (current: ${assignment.status.value}).`,
      );
    }

    if (assignment.requiresDirectorApproval) {
      throw new ConflictException(
        'Director approval is still pending for this assignment; onboarding cannot be scheduled until it is recorded.',
      );
    }

    if (onboardingDate > assignment.validFrom) {
      throw new BadRequestException(
        'onboardingDate cannot be after the assignment start date.',
      );
    }

    const timestamp = new Date();
    const previousOnboardingDate = assignment.onboardingDate;

    assignment.setOnboardingDate(onboardingDate);
    assignment.transitionTo('ONBOARDING', { actorRoles: input.actorRoles, timestamp });

    if (this.slaService) {
      await this.slaService.applyTransition(assignment, timestamp);
    }

    await this.assignmentRepository.save(assignment);
    await this.assignmentRepository.appendHistory(
      AssignmentHistory.create({
        assignmentId: assignment.assignmentId,
        changeReason: 'Onboarding scheduled.',
        changeType: 'ONBOARDING_SCHEDULED',
        changedByPersonId: input.actorId,
        previousSnapshot: {
          status: 'BOOKED',
          onboardingDate: previousOnboardingDate?.toISOString() ?? null,
        },
        newSnapshot: {
          status: assignment.status.value,
          onboardingDate: onboardingDate.toISOString(),
        },
        occurredAt: timestamp,
      }),
    );

    this.auditLogger?.record({
      actionType: 'assignment.onboarding_scheduled',
      actorId: input.actorId,
      category: 'assignment',
      changeSummary: `Onboarding scheduled on ${onboardingDate.toISOString().slice(0, 10)} for assignment ${input.assignmentId}.`,
      details: {
        assignmentId: input.assignmentId,
        onboardingDate: onboardingDate.toISOString(),
        assignmentStartDate: assignment.validFrom.toISOString(),
      },
      metadata: {
        onboardingDate: onboardingDate.toISOString(),
      },
      targetEntityId: input.assignmentId,
      targetEntityType: 'ASSIGNMENT',
    });

    await this.notificationEventTranslator
      ?.assignmentOnboardingScheduled({
        assignmentId: input.assignmentId,
        onboardingDate: onboardingDate.toISOString().slice(0, 10),
        recipientPersonIds: [assignment.personId],
      })
      .catch(() => undefined);

    return assignment;
  }

  private parseDate(value: string, label: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} is not a valid date.`);
    }
    return parsed;
  }
}
