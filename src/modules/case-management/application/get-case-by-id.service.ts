import { Injectable } from '@nestjs/common';

import { CaseRecord } from '../domain/entities/case-record.entity';
import { CaseRecordRepositoryPort } from '../domain/repositories/case-record-repository.port';
import { CaseId } from '../domain/value-objects/case-id';

@Injectable()
export class GetCaseByIdService {
  public constructor(private readonly caseRecordRepository: CaseRecordRepositoryPort) {}

  public async execute(caseId: string): Promise<CaseRecord | null> {
    return this.caseRecordRepository.findByCaseId(CaseId.from(caseId));
  }
}
