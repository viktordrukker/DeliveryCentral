import { demoReportingLines } from '../../../../../../prisma/seeds/demo-dataset';
import { ReportingAuthority, ReportingLine } from '../../../domain/entities/reporting-line.entity';
import { EffectiveDateRange } from '../../../domain/value-objects/effective-date-range';
import { PersonId } from '../../../domain/value-objects/person-id';
import { ReportingLineType } from '../../../domain/value-objects/reporting-line-type';
import { InMemoryReportingLineRepository } from './in-memory-reporting-line.repository';

function mapReportingLineType(value: string): ReportingLineType {
  switch (value) {
    case 'DOTTED_LINE':
      return ReportingLineType.dottedLine();
    case 'FUNCTIONAL':
      return ReportingLineType.functional();
    case 'PROJECT':
      return ReportingLineType.project();
    case 'SOLID_LINE':
    default:
      return ReportingLineType.solidLine();
  }
}

function mapReportingAuthority(value: string): ReportingAuthority {
  switch (value) {
    case 'REVIEWER':
      return 'REVIEWER';
    case 'VIEWER':
      return 'VIEWER';
    case 'APPROVER':
    default:
      return 'APPROVER';
  }
}

export function createSeededInMemoryReportingLineRepository(): InMemoryReportingLineRepository {
  return new InMemoryReportingLineRepository(
    demoReportingLines.map((line) =>
      ReportingLine.create(
        {
          authority: mapReportingAuthority(line.authority),
          effectiveDateRange: EffectiveDateRange.create(
            line.validFrom,
            (line as { validTo?: Date }).validTo,
          ),
          isPrimary: line.isPrimary,
          managerId: PersonId.from(line.managerPersonId),
          subjectId: PersonId.from(line.subjectPersonId),
          type: mapReportingLineType(line.relationshipType),
        },
        line.id,
      ),
    ),
  );
}
