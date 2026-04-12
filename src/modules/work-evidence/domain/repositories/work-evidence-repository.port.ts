import { RepositoryPort } from '@src/shared/domain/repository-port';

import { WorkEvidence } from '../entities/work-evidence.entity';
import { WorkEvidenceId } from '../value-objects/work-evidence-id';

export interface WorkEvidenceRepositoryPort extends RepositoryPort<WorkEvidence> {
  findByProjectId(projectId: string, asOf: Date): Promise<WorkEvidence[]>;
  list(query: {
    dateFrom?: Date;
    dateTo?: Date;
    personId?: string;
    projectId?: string;
    sourceType?: string;
  }): Promise<WorkEvidence[]>;
  findByWorkEvidenceId(workEvidenceId: WorkEvidenceId): Promise<WorkEvidence | null>;
}
