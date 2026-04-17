import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';

import { Person } from '../domain/entities/person.entity';
import { PersonRepositoryPort } from '../domain/repositories/person-repository.port';
import { PersonId } from '../domain/value-objects/person-id';

@Injectable()
export class DeactivateEmployeeService {
  public constructor(
    private readonly personRepository: PersonRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly employeeActivityService?: { record(cmd: { personId: string; eventType: string; summary: string; actorId?: string; metadata?: Record<string, unknown> }): Promise<void> },
    private readonly createLifecycleCase?: (cmd: { caseTypeKey: string; ownerPersonId: string; subjectPersonId: string; summary: string }) => Promise<unknown>,
  ) {}

  public async execute(personId: string): Promise<Person> {
    const employee = await this.personRepository.findByPersonId(PersonId.from(personId));

    if (!employee) {
      throw new Error('Employee does not exist.');
    }

    employee.deactivate();
    employee.pullDomainEvents();

    await this.personRepository.save(employee);
    this.auditLogger?.record({
      actionType: 'employee.deactivated',
      actorId: personId,
      category: 'organization',
      changeSummary: `Employee ${employee.personId.value} deactivated.`,
      details: {
        status: employee.status,
      },
      metadata: {
        status: employee.status,
      },
      targetEntityId: employee.personId.value,
      targetEntityType: 'EMPLOYEE',
    });

    void this.employeeActivityService?.record({
      personId,
      eventType: 'DEACTIVATED',
      summary: `Employee deactivated.`,
    });

    // Auto-create offboarding case (20b-09)
    void this.createLifecycleCase?.({
      caseTypeKey: 'OFFBOARDING',
      ownerPersonId: personId,
      subjectPersonId: personId,
      summary: `Offboarding for ${employee.displayName}`,
    });

    return employee;
  }
}
