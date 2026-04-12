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

    return employee;
  }
}
