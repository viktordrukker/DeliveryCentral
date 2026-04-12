import { Injectable } from '@nestjs/common';

import { CaseRecord } from '../domain/entities/case-record.entity';
import { CaseRecordRepositoryPort } from '../domain/repositories/case-record-repository.port';

interface ListCasesQuery {
  caseTypeKey?: string;
  ownerPersonId?: string;
  page?: number;
  pageSize?: number;
  subjectPersonId?: string;
}

@Injectable()
export class ListCasesService {
  public constructor(private readonly caseRecordRepository: CaseRecordRepositoryPort) {}

  public async execute(query: ListCasesQuery): Promise<{ items: CaseRecord[]; page: number; pageSize: number; total: number }> {
    const all = await this.caseRecordRepository.list(query);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 25));
    const total = all.length;
    const items = all.slice((page - 1) * pageSize, page * pageSize);

    return { items, page, pageSize, total };
  }
}
