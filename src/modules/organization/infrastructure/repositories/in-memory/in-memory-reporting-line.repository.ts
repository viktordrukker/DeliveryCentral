import { ReportingLine } from '@src/modules/organization/domain/entities/reporting-line.entity';
import { ReportingLineRepositoryPort } from '@src/modules/organization/domain/repositories/reporting-line-repository.port';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { ReportingLineType } from '@src/modules/organization/domain/value-objects/reporting-line-type';

export class InMemoryReportingLineRepository implements ReportingLineRepositoryPort {
  public constructor(private readonly items: ReportingLine[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findById(id: string): Promise<ReportingLine | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async findActiveByManager(
    managerId: PersonId,
    asOf: Date,
    relationshipTypes?: ReportingLineType[],
  ): Promise<ReportingLine[]> {
    return this.items.filter(
      (item) =>
        item.managerId.equals(managerId) &&
        item.isEffectiveAt(asOf) &&
        this.matchesType(item, relationshipTypes),
    );
  }

  public async findBySubject(
    subjectId: PersonId,
    relationshipTypes?: ReportingLineType[],
  ): Promise<ReportingLine[]> {
    return this.items.filter(
      (item) => item.subjectId.equals(subjectId) && this.matchesType(item, relationshipTypes),
    );
  }

  public async findActiveBySubject(
    subjectId: PersonId,
    asOf: Date,
    relationshipTypes?: ReportingLineType[],
  ): Promise<ReportingLine[]> {
    return this.items.filter(
      (item) =>
        item.subjectId.equals(subjectId) &&
        item.isEffectiveAt(asOf) &&
        this.matchesType(item, relationshipTypes),
    );
  }

  public async save(aggregate: ReportingLine): Promise<void> {
    const existingIndex = this.items.findIndex((item) => item.id === aggregate.id);
    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }

  private matchesType(
    item: ReportingLine,
    relationshipTypes?: ReportingLineType[],
  ): boolean {
    if (!relationshipTypes || relationshipTypes.length === 0) {
      return true;
    }

    return relationshipTypes.some((relationshipType) => item.type.equals(relationshipType));
  }
}
