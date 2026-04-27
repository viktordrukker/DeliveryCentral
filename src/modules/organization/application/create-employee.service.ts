import { randomUUID } from 'node:crypto';

import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

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
  private readonly logger = new Logger(CreateEmployeeService.name);

  public constructor(
    private readonly personRepository: PersonRepositoryPort,
    private readonly orgUnitRepository: OrgUnitRepositoryPort,
    private readonly personOrgMembershipRepository: PersonOrgMembershipRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly employeeActivityService?: { record(cmd: { personId: string; eventType: string; summary: string; actorId?: string; metadata?: Record<string, unknown> }): Promise<void> },
    private readonly createLifecycleCase?: (cmd: { caseTypeKey: string; ownerPersonId: string; subjectPersonId: string; summary: string }) => Promise<unknown>,
  ) {}

  public async execute(command: CreateEmployeeCommand): Promise<Person> {
    const normalizedEmail = command.email.trim().toLowerCase();
    const targetOrgUnitId = OrgUnitId.from(command.orgUnitId);

    const existingEmployee = await this.personRepository.findByEmail(normalizedEmail);
    if (existingEmployee) {
      throw new ConflictException('Employee email already exists.');
    }

    const orgUnit = await this.orgUnitRepository.findByOrgUnitId(targetOrgUnitId);
    if (!orgUnit) {
      throw new NotFoundException('Org unit does not exist.');
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

    // DATA-05: pseudo-transactional cleanup. Repositories are domain ports (no shared Prisma tx),
    // so on membership-save failure we compensate by deleting the orphaned person record.
    let personSaved = false;
    try {
      await this.personRepository.save(employee);
      personSaved = true;
      await this.personOrgMembershipRepository.save(membership);
    } catch (error: unknown) {
      const isUniqueViolation = error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002';
      if (personSaved) {
        // Best-effort rollback of the orphaned person.
        try {
          await this.personRepository.delete(employee.personId.value);
        } catch (rollbackErr) {
          this.logger.error(
            `Failed to rollback orphan person ${employee.personId.value} after membership save failure: ${rollbackErr instanceof Error ? rollbackErr.message : 'unknown'}`,
          );
        }
      }
      if (isUniqueViolation) {
        throw new ConflictException('Employee email already exists.');
      }
      throw error;
    }
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

    this.employeeActivityService?.record({
      personId: employee.personId.value,
      eventType: 'HIRED',
      summary: `Employee ${command.name} hired. Email: ${command.email}`,
      metadata: { email: command.email, orgUnitId: command.orgUnitId },
    }).catch((err: unknown) => {
      this.logger.warn(`Activity event HIRED for ${employee.personId.value} failed: ${err instanceof Error ? err.message : 'unknown'}`);
    });

    // Auto-create onboarding case (20b-08)
    this.createLifecycleCase?.({
      caseTypeKey: 'ONBOARDING',
      ownerPersonId: employee.personId.value,
      subjectPersonId: employee.personId.value,
      summary: `Onboarding for ${command.name}`,
    })?.catch((err: unknown) => {
      this.logger.warn(`Onboarding case creation for ${employee.personId.value} failed: ${err instanceof Error ? err.message : 'unknown'}`);
    });

    return employee;
  }
}
