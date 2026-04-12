import { RepositoryPort } from '@src/shared/domain/repository-port';

import { ReportingLine } from '../entities/reporting-line.entity';
import { PersonId } from '../value-objects/person-id';
import { ReportingLineType } from '../value-objects/reporting-line-type';

export interface ReportingLineRepositoryPort extends RepositoryPort<ReportingLine> {
  findBySubject(
    subjectId: PersonId,
    relationshipTypes?: ReportingLineType[],
  ): Promise<ReportingLine[]>;
  findActiveByManager(
    managerId: PersonId,
    asOf: Date,
    relationshipTypes?: ReportingLineType[],
  ): Promise<ReportingLine[]>;
  findActiveBySubject(
    subjectId: PersonId,
    asOf: Date,
    relationshipTypes?: ReportingLineType[],
  ): Promise<ReportingLine[]>;
}
