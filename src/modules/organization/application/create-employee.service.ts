import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';

import { Person } from '../domain/entities/person.entity';
import { PersonOrgMembership } from '../domain/entities/person-org-membership.entity';
import { OrgUnitRepositoryPort } from '../domain/repositories/org-unit-repository.port';
import { PersonOrgMembershipRepositoryPort } from '../domain/repositories/person-org-membership-repository.port';
import { PersonRepositoryPort } from '../domain/repositories/person-repository.port';
import { EffectiveDateRange } from '../domain/value-objects/effective-date-range';
import { OrgUnitId } from '../domain/value-objects/org-unit-id';

interface CreateEmployeeCommand {
  email: string;
  grade?: string;
  name: string;
  orgUnitId: string;
  role?: string;
  skillsets?: string[];
  status?: 'ACTIVE' | 'INACTIVE';
}

@Injectable()
export class CreateEmployeeService {
  public constructor(
    private readonly personRepository: PersonRepositoryPort,
    private readonly orgUnitRepository: OrgUnitRepositoryPort,
    private readonly personOrgMembershipRepository: PersonOrgMembershipRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(command: CreateEmployeeCommand): Promise<Person> {
    const normalizedEmail = command.email.trim().toLowerCase();
    const targetOrgUnitId = OrgUnitId.from(command.orgUnitId);

    const existingEmployee = await this.personRepository.findByEmail(normalizedEmail);
    if (existingEmployee) {
      throw new Error('Employee email already exists.');
    }

    const orgUnit = await this.orgUnitRepository.findByOrgUnitId(targetOrgUnitId);
    if (!orgUnit) {
      throw new Error('Org unit does not exist.');
    }

    const employee = Person.createEmployee({
      email: normalizedEmail,
      grade: command.grade,
      name: command.name,
      orgUnitId: targetOrgUnitId,
      role: command.role,
      skillsets: command.skillsets,
      status: command.status,
    });

    const membership = PersonOrgMembership.create(
      {
        effectiveDateRange: EffectiveDateRange.create(new Date()),
        isPrimary: true,
        orgUnitId: targetOrgUnitId,
        personId: employee.personId,
      },
      randomUUID(),
    );

    employee.pullDomainEvents();

    await this.personRepository.save(employee);
    await this.personOrgMembershipRepository.save(membership);
    this.auditLogger?.record({
      actionType: 'employee.created',
      actorId: null,
      category: 'organization',
      changeSummary: `Employee ${employee.displayName} created in org unit ${command.orgUnitId}.`,
      details: {
        email: employee.primaryEmail,
        orgUnitId: command.orgUnitId,
        status: employee.status,
      },
      metadata: {
        email: employee.primaryEmail,
        orgUnitId: command.orgUnitId,
        status: employee.status,
      },
      targetEntityId: employee.personId.value,
      targetEntityType: 'EMPLOYEE',
    });

    return employee;
  }
}
