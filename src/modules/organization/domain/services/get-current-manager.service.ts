import { ReportingLine } from '../entities/reporting-line.entity';
import { ReportingLineRepositoryPort } from '../repositories/reporting-line-repository.port';
import { PersonId } from '../value-objects/person-id';
import { ReportingLineType } from '../value-objects/reporting-line-type';

interface GetCurrentManagerInput {
  asOf: Date;
  personId: PersonId;
}

export class GetCurrentManagerService {
  public constructor(
    private readonly reportingLineRepository: ReportingLineRepositoryPort,
  ) {}

  public async execute(input: GetCurrentManagerInput): Promise<ReportingLine | null> {
    const activeManagers = await this.reportingLineRepository.findActiveBySubject(
      input.personId,
      input.asOf,
      [ReportingLineType.solidLine()],
    );

    return activeManagers.find((item) => item.isPrimary) ?? activeManagers[0] ?? null;
  }
}
