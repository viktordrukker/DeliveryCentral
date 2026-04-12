import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { EndProjectAssignmentService } from '@src/modules/assignments/application/end-project-assignment.service';
import { ProjectAssignmentRepositoryPort } from '@src/modules/assignments/domain/repositories/project-assignment-repository.port';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

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
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly endProjectAssignmentService: EndProjectAssignmentService,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  public async execute(command: TerminateEmployeeCommand): Promise<Person> {
    const employee = await this.personRepository.findByPersonId(PersonId.from(command.personId));

    if (!employee) {
      throw new Error('Employee does not exist.');
    }

    const terminatedAt = command.terminatedAt ? new Date(command.terminatedAt) : new Date();

    if (Number.isNaN(terminatedAt.getTime())) {
      throw new Error('terminatedAt is not a valid date.');
    }

    employee.terminate(terminatedAt);
    await this.personRepository.save(employee);

    // End all active/approved assignments
    const allAssignments = await this.projectAssignmentRepository.findAll();
    const assignmentsToEnd = allAssignments.filter(
      (a) =>
        a.personId === command.personId &&
        (a.status.value === 'ACTIVE' || a.status.value === 'APPROVED'),
    );

    const endDateStr = terminatedAt.toISOString().slice(0, 10);
    for (const assignment of assignmentsToEnd) {
      await this.endProjectAssignmentService.execute({
        actorId: command.actorId ?? 'system',
        assignmentId: assignment.assignmentId.value,
        endDate: endDateStr,
        reason: command.reason ?? 'Employee terminated',
      });
    }

    this.auditLogger?.record({
      actionType: 'employee.terminated',
      actorId: command.actorId ?? 'system',
      category: 'organization',
      changeSummary: `Employee ${employee.personId.value} terminated. ${assignmentsToEnd.length} assignment(s) ended.`,
      details: {
        assignmentsEnded: assignmentsToEnd.length,
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

    return employee;
  }
}
