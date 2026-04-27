import { BadRequestException, Injectable } from '@nestjs/common';

import { WorkEvidenceRepositoryPort } from '../domain/repositories/work-evidence-repository.port';

interface ListWorkEvidenceQuery {
  dateFrom?: string;
  dateTo?: string;
  personId?: string;
  projectId?: string;
  sourceType?: string;
}

@Injectable()
export class ListWorkEvidenceService {
  public constructor(
    private readonly workEvidenceRepository: WorkEvidenceRepositoryPort,
  ) {}

  public async execute(query: ListWorkEvidenceQuery) {
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    if (dateFrom && Number.isNaN(dateFrom.getTime())) {
      throw new BadRequestException('Work evidence dateFrom is invalid.');
    }

    if (dateTo && Number.isNaN(dateTo.getTime())) {
      throw new BadRequestException('Work evidence dateTo is invalid.');
    }

    return {
      items: await this.workEvidenceRepository.list({
        dateFrom,
        dateTo,
        personId: query.personId,
        projectId: query.projectId,
        sourceType: query.sourceType?.toUpperCase(),
      }),
    };
  }
}
