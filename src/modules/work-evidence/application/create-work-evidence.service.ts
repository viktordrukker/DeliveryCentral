import { createHash } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';

import { WorkEvidence } from '../domain/entities/work-evidence.entity';
import { WorkEvidenceSource } from '../domain/entities/work-evidence-source.entity';
import { WorkEvidenceRepositoryPort } from '../domain/repositories/work-evidence-repository.port';

interface CreateWorkEvidenceCommand {
  details?: Record<string, unknown>;
  effortHours: number;
  personId?: string;
  projectId?: string;
  recordedAt: string;
  sourceRecordKey: string;
  sourceType: string;
  summary?: string;
  trace?: Record<string, unknown>;
}

@Injectable()
export class CreateWorkEvidenceService {
  public constructor(
    private readonly workEvidenceRepository: WorkEvidenceRepositoryPort,
  ) {}

  public async execute(command: CreateWorkEvidenceCommand): Promise<WorkEvidence> {
    const recordedAt = new Date(command.recordedAt);

    if (Number.isNaN(recordedAt.getTime())) {
      throw new BadRequestException('Work evidence recordedAt is invalid.');
    }

    if (!command.sourceRecordKey.trim()) {
      throw new BadRequestException('Work evidence sourceRecordKey is required.');
    }

    if (!command.sourceType.trim()) {
      throw new BadRequestException('Work evidence sourceType is required.');
    }

    if (command.effortHours <= 0) {
      throw new BadRequestException('Work evidence effortHours must be greater than zero.');
    }

    const evidence = WorkEvidence.create({
      details: command.details,
      durationMinutes: Math.round(command.effortHours * 60),
      evidenceType: command.sourceType.toUpperCase(),
      personId: command.personId,
      projectId: command.projectId,
      recordedAt,
      source: WorkEvidenceSource.create(
        {
          displayName: `Manual ${command.sourceType}`,
          provider: 'INTERNAL',
          sourceType: command.sourceType.toUpperCase(),
        },
        this.buildSourceId({
          provider: 'INTERNAL',
          sourceType: command.sourceType.toUpperCase(),
        }),
      ),
      sourceRecordKey: command.sourceRecordKey,
      summary: command.summary,
      trace: command.trace,
    });

    await this.workEvidenceRepository.save(evidence);

    return evidence;
  }

  private buildSourceId(input: { connectionKey?: string; provider: string; sourceType: string }): string {
    const seed = [input.provider, input.sourceType, input.connectionKey ?? ''].join(':');
    const hash = createHash('sha1').update(seed).digest('hex');

    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  }
}
