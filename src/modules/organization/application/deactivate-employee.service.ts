import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { UndoService } from '@src/modules/undo/application/undo.service';

import { Person } from '../domain/entities/person.entity';
import { PersonRepositoryPort } from '../domain/repositories/person-repository.port';
import { PersonId } from '../domain/value-objects/person-id';

// HD-8 / Chunk 8.4a — return shape extended with `undoActionId`. The
// existing single-`Person` return is wrapped so the controller can
// surface the token to the FE for a sonner Undo toast.
export interface DeactivateEmployeeResult {
  person: Person;
  undoActionId: string | null;
}

@Injectable()
export class DeactivateEmployeeService {
  public constructor(
    private readonly personRepository: PersonRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly employeeActivityService?: { record(cmd: { personId: string; eventType: string; summary: string; actorId?: string; metadata?: Record<string, unknown> }): Promise<void> },
    private readonly createLifecycleCase?: (cmd: { caseTypeKey: string; ownerPersonId: string; subjectPersonId: string; summary: string }) => Promise<unknown>,
    private readonly undoService?: UndoService,
  ) {}

  public async execute(
    personId: string,
    actorId?: string,
  ): Promise<DeactivateEmployeeResult> {
    const employee = await this.personRepository.findByPersonId(PersonId.from(personId));

    if (!employee) {
      throw new NotFoundException('Employee does not exist.');
    }

    employee.deactivate();
    employee.pullDomainEvents();

    await this.personRepository.save(employee);
    this.auditLogger?.record({
      actionType: 'employee.deactivated',
      actorId: actorId ?? personId,
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

    // HD-8 / Chunk 8.4a — register an undo token so the deactivate is
    // reversible from a toast. Inverse is "restore status to ACTIVE".
    let undoActionId: string | null = null;
    if (this.undoService && actorId) {
      try {
        undoActionId = await this.undoService.register({
          actorId,
          actionType: 'person.deactivate',
          entityId: personId,
          inversePayload: { previousStatus: 'ACTIVE' },
        });
      } catch {
        // Undo registration is convenience — never block the deactivate.
      }
    }

    return { person: employee, undoActionId };
  }
}
