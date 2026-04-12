import { ReportingLine } from '../entities/reporting-line.entity';
import { ReportingLineRepositoryPort } from '../repositories/reporting-line-repository.port';
import { PersonId } from '../value-objects/person-id';
import { ReportingLineType } from '../value-objects/reporting-line-type';

interface GetReportingChainAtDateInput {
  asOf: Date;
  personId: PersonId;
}

export class GetReportingChainAtDateService {
  public constructor(
    private readonly reportingLineRepository: ReportingLineRepositoryPort,
  ) {}

  public async execute(input: GetReportingChainAtDateInput): Promise<ReportingLine[]> {
    const chain: ReportingLine[] = [];
    const visited = new Set<string>();
    let currentPersonId = input.personId;

    while (!visited.has(currentPersonId.value)) {
      visited.add(currentPersonId.value);
      const nextManager = await this.reportingLineRepository.findActiveBySubject(
        currentPersonId,
        input.asOf,
        [ReportingLineType.solidLine()],
      );
      const selected = nextManager.find((item) => item.isPrimary) ?? nextManager[0];

      if (!selected) {
        break;
      }

      chain.push(selected);
      currentPersonId = selected.managerId;
    }

    return chain;
  }
}
