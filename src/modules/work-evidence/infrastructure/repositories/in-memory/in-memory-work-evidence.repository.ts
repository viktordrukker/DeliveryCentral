import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceRepositoryPort } from '@src/modules/work-evidence/domain/repositories/work-evidence-repository.port';
import { WorkEvidenceId } from '@src/modules/work-evidence/domain/value-objects/work-evidence-id';

export class InMemoryWorkEvidenceRepository implements WorkEvidenceRepositoryPort {
  public constructor(private readonly items: WorkEvidence[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findById(id: string): Promise<WorkEvidence | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async findByProjectId(projectId: string, asOf: Date): Promise<WorkEvidence[]> {
    return this.items.filter(
      (item) => item.projectId === projectId && item.recordedAt <= asOf,
    );
  }

  public async list(query: {
    dateFrom?: Date;
    dateTo?: Date;
    personId?: string;
    projectId?: string;
    sourceType?: string;
  }): Promise<WorkEvidence[]> {
    return this.items.filter((item) => {
      if (query.personId && item.personId !== query.personId) {
        return false;
      }

      if (query.projectId && item.projectId !== query.projectId) {
        return false;
      }

      if (query.sourceType && item.source.sourceType !== query.sourceType) {
        return false;
      }

      if (query.dateFrom && item.recordedAt < query.dateFrom) {
        return false;
      }

      if (query.dateTo && item.recordedAt > query.dateTo) {
        return false;
      }

      return true;
    });
  }

  public async findByWorkEvidenceId(
    workEvidenceId: WorkEvidenceId,
  ): Promise<WorkEvidence | null> {
    return this.items.find((item) => item.workEvidenceId.equals(workEvidenceId)) ?? null;
  }

  public async save(aggregate: WorkEvidence): Promise<void> {
    const index = this.items.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      this.items.splice(index, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
