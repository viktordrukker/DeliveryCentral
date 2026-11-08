import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PROJECT_POSITION_REPOSITORY } from '@src/modules/project-positions/application/tokens';
import { TransitionProjectPositionFillService } from '@src/modules/project-positions/application/transition-project-position-fill.service';
import { ProjectPositionRepositoryPort } from '@src/modules/project-positions/domain/repositories/project-position-repository.port';

import { Person } from '../domain/entities/person.entity';
import { PersonRepositoryPort } from '../domain/repositories/person-repository.port';
import { PersonId } from '../domain/value-objects/person-id';

interface TerminateEmployeeCommand {
  actorId?: string;
  personId: string;
  reason?: string;
  terminatedAt?: string;
}

@Injectable()
export class TerminateEmployeeService {
  public constructor(
    private readonly personRepository: PersonRepositoryPort,
    @Inject(PROJECT_POSITION_REPOSITORY)
    private readonly projectPositionRepository: ProjectPositionRepositoryPort,
    private readonly transitionProjectPositionFillService: TransitionProjectPositionFillService,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    private readonly employeeActivityService?: { record(cmd: { personId: string; eventType: string; summary: string; actorId?: string; occurredAt?: Date; metadata?: Record<string, unknown> }): Promise<void> },
  ) {}

  public async execute(command: TerminateEmployeeCommand): Promise<Person> {
    const employee = await this.personRepository.findByPersonId(PersonId.from(command.personId));

    if (!employee) {
      throw new NotFoundException('Employee does not exist.');
    }

    const terminatedAt = command.terminatedAt ? new Date(command.terminatedAt) : new Date();

    if (Number.isNaN(terminatedAt.getTime())) {
      throw new BadRequestException('terminatedAt is not a valid date.');
    }

    employee.terminate(terminatedAt);
    await this.personRepository.save(employee);

    // SoT PR 16a/1 — release all active ProjectPosition fills held by this
    // employee (sourced from the canonical position aggregate; replaces the
    // legacy assignment iteration).
    const activePositions = await this.projectPositionRepository.findActiveByPersonId(
      command.personId,
      terminatedAt,
    );

    const reason = command.reason ?? 'Employee terminated';
    for (const position of activePositions) {
      await this.transitionProjectPositionFillService.execute({
        positionId: position.positionId.value,
        toStatus: 'RELEASED',
        actorId: command.actorId ?? 'system',
        actorRoles: ['admin'],
        reason,
      });
    }

    this.auditLogger?.record({
      actionType: 'employee.terminated',
      actorId: command.actorId ?? 'system',
      category: 'organization',
      changeSummary: `Employee ${employee.personId.value} terminated. ${activePositions.length} assignment(s) ended.`,
      details: {
        assignmentsEnded: activePositions.length,
        reason: command.reason,
        terminatedAt: terminatedAt.toISOString(),
      },
      metadata: {
        reason: command.reason,
        terminatedAt: terminatedAt.toISOString(),
      },
      targetEntityId: employee.personId.value,
      targetEntityType: 'EMPLOYEE',
    });

    void this.notificationEventTranslator?.employeeTerminated({ personId: employee.personId.value });

    void this.employeeActivityService?.record({
      personId: command.personId,
      eventType: 'TERMINATED',
      summary: `Employee terminated. ${activePositions.length} assignment(s) ended. Reason: ${command.reason ?? 'Not specified'}`,
      actorId: command.actorId,
      occurredAt: terminatedAt,
      metadata: { assignmentsEnded: activePositions.length, reason: command.reason },
    });

    return employee;
  }
}
