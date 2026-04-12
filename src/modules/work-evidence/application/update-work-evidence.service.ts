import { Injectable } from '@nestjs/common';

import { WorkEvidence } from '../domain/entities/work-evidence.entity';
import { WorkEvidenceId } from '../domain/value-objects/work-evidence-id';
import { WorkEvidenceRepositoryPort } from '../domain/repositories/work-evidence-repository.port';

interface UpdateWorkEvidenceCommand {
  effortHours?: number;
  occurredOn?: string;
  sourceRecordKey?: string;
  summary?: string;
  workEvidenceId: string;
}

@Injectable()
export class UpdateWorkEvidenceService {
  public constructor(private readonly workEvidenceRepository: WorkEvidenceRepositoryPort) {}

  public async execute(command: UpdateWorkEvidenceCommand): Promise<WorkEvidence> {
    const id = WorkEvidenceId.from(command.workEvidenceId);
    const evidence = await this.workEvidenceRepository.findByWorkEvidenceId(id);

    if (!evidence) {
      throw new Error('Work evidence not found.');
    }

    const changes: Parameters<typeof evidence.update>[0] = {};

    if (command.effortHours !== undefined) {
      changes.durationMinutes = Math.round(command.effortHours * 60);
    }

    if (command.occurredOn !== undefined) {
      const date = new Date(command.occurredOn);
      if (Number.isNaN(date.getTime())) {
        throw new Error('Activity date is invalid.');
      }
      changes.occurredOn = date;
    }

    if (command.sourceRecordKey !== undefined) {
      changes.sourceRecordKey = command.sourceRecordKey;
    }

    if (command.summary !== undefined) {
      changes.summary = command.summary;
    }

    evidence.update(changes);
    await this.workEvidenceRepository.save(evidence);

    return evidence;
  }
}
