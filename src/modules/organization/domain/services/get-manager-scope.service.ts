import { ReportingLineRepositoryPort } from '../repositories/reporting-line-repository.port';
import { PersonId } from '../value-objects/person-id';
import { ReportingLineType } from '../value-objects/reporting-line-type';

interface GetManagerScopeInput {
  asOf: Date;
  includeRelationshipTypes?: ReportingLineType[];
  managerId: PersonId;
}

interface ManagerScopeResult {
  directReportIds: PersonId[];
}

export class GetManagerScopeService {
  public constructor(
    private readonly reportingLineRepository: ReportingLineRepositoryPort,
  ) {}

  public async execute(input: GetManagerScopeInput): Promise<ManagerScopeResult> {
    const activeRelationships = await this.reportingLineRepository.findActiveByManager(
      input.managerId,
      input.asOf,
      input.includeRelationshipTypes,
    );

    return {
      directReportIds: activeRelationships.map((item) => item.subjectId),
    };
  }
}
