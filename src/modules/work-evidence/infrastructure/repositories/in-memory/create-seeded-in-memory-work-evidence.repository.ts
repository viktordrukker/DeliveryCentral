import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceSource } from '@src/modules/work-evidence/domain/entities/work-evidence-source.entity';
import { WorkEvidenceId } from '@src/modules/work-evidence/domain/value-objects/work-evidence-id';

import {
  demoWorkEvidence,
  demoWorkEvidenceSources,
} from '../../../../../../prisma/seeds/demo-dataset';
import { InMemoryWorkEvidenceRepository } from './in-memory-work-evidence.repository';

export function createSeededInMemoryWorkEvidenceRepository(): InMemoryWorkEvidenceRepository {
  const sources = new Map(
    demoWorkEvidenceSources.map((source) => [
      source.id,
      WorkEvidenceSource.create(
        {
          connectionKey: source.connectionKey,
          displayName: source.displayName,
          provider: source.provider,
          sourceType: source.sourceType,
        },
        source.id,
      ),
    ]),
  );

  const items = demoWorkEvidence.map((item) =>
    WorkEvidence.create(
      {
        details: item.details ?? undefined,
        durationMinutes: item.durationMinutes,
        evidenceType: item.evidenceType,
        occurredOn: item.occurredOn ?? undefined,
        personId: item.personId ?? undefined,
        projectId: item.projectId ?? undefined,
        recordedAt: item.recordedAt,
        source: sources.get(item.workEvidenceSourceId)!,
        sourceRecordKey: item.sourceRecordKey,
        summary: item.summary ?? undefined,
      },
      WorkEvidenceId.from(item.id),
    ),
  );

  return new InMemoryWorkEvidenceRepository(items);
}
