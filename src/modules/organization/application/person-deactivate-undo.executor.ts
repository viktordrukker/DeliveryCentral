import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import {
  UndoActionExecutor,
  UndoActionRow,
} from '@src/modules/undo/application/undo-action-executor.registry';

import { PersonRepositoryPort } from '../domain/repositories/person-repository.port';
import { PersonId } from '../domain/value-objects/person-id';

// HD-8 / Chunk 8.4a — undo executor for `person.deactivate`. Calls
// the privileged `restoreFromDeactivation()` domain method (the
// public Person API doesn't expose reactivate; safety boundary is
// the undo token's TTL + actor check). Refuses on TERMINATED rows
// because termination is a different lifecycle (HD-5 dual-approval
// release flow).
@Injectable()
export class PersonDeactivateUndoExecutor implements UndoActionExecutor {
  public readonly actionType = 'person.deactivate';
  private readonly logger = new Logger(PersonDeactivateUndoExecutor.name);

  public constructor(
    private readonly personRepository: PersonRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(row: UndoActionRow): Promise<void> {
    const person = await this.personRepository.findByPersonId(
      PersonId.from(row.entityId),
    );
    if (!person) {
      throw new NotFoundException(`Person ${row.entityId} not found.`);
    }

    if (person.status !== 'INACTIVE') {
      this.logger.debug(
        `Person ${row.entityId} is in status ${person.status}; restore is a no-op.`,
      );
      return;
    }

    person.restoreFromDeactivation();
    await this.personRepository.save(person);

    this.auditLogger?.record({
      actionType: 'person.deactivate.undone',
      actorId: row.actorId,
      category: 'organization',
      changeSummary: `Deactivation of person ${row.entityId} reversed by undo token (restored to ACTIVE).`,
      details: {
        undoActionId: row.id,
        previousStatus: 'INACTIVE',
        currentStatus: 'ACTIVE',
      },
      metadata: {
        undoActionId: row.id,
      },
      targetEntityId: row.entityId,
      targetEntityType: 'EMPLOYEE',
    });
  }
}
