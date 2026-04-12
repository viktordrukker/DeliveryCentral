import { Injectable } from '@nestjs/common';

import {
  ListPersonDirectoryResult,
  PersonDirectoryQueryRepositoryPort,
  PersonDirectoryRecord,
} from './ports/person-directory-query.repository.port';
import { ListPeopleQuery } from './contracts/person-directory.query';

@Injectable()
export class PersonDirectoryQueryService {
  public constructor(
    private readonly personDirectoryQueryRepository: PersonDirectoryQueryRepositoryPort,
  ) {}

  public async getPersonById(id: string, asOf: Date = new Date()): Promise<PersonDirectoryRecord | null> {
    return this.personDirectoryQueryRepository.findById(id, asOf);
  }

  public async listPeople(query: ListPeopleQuery, asOf: Date = new Date()): Promise<ListPersonDirectoryResult> {
    return this.personDirectoryQueryRepository.list({
      asOf,
      departmentId: query.departmentId,
      page: query.page,
      pageSize: query.pageSize,
      resourcePoolId: query.resourcePoolId,
      role: query.role,
    });
  }
}
