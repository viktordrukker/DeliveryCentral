import { Injectable } from '@nestjs/common';

import { CaseRecord } from '@src/modules/case-management/domain/entities/case-record.entity';
import { CaseRecordRepositoryPort } from '@src/modules/case-management/domain/repositories/case-record-repository.port';
import { CaseId } from '@src/modules/case-management/domain/value-objects/case-id';

@Injectable()
export class InMemoryCaseRecordRepository implements CaseRecordRepositoryPort {
  public constructor(private readonly items: CaseRecord[] = []) {}

  public async count(): Promise<number> {
    return this.items.length;
  }

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findByCaseId(caseId: CaseId): Promise<CaseRecord | null> {
    return this.items.find((item) => item.caseId.equals(caseId)) ?? null;
  }

  public async findById(id: string): Promise<CaseRecord | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async list(query: {
    caseTypeKey?: string;
    ownerPersonId?: string;
    subjectPersonId?: string;
  }): Promise<CaseRecord[]> {
    return this.items.filter((item) => {
      if (query.caseTypeKey && item.caseType.key !== query.caseTypeKey) {
        return false;
      }

      if (query.ownerPersonId && item.ownerPersonId !== query.ownerPersonId) {
        return false;
      }

      if (query.subjectPersonId && item.subjectPersonId !== query.subjectPersonId) {
        return false;
      }

      return true;
    });
  }

  public async save(aggregate: CaseRecord): Promise<void> {
    const index = this.items.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      this.items.splice(index, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
