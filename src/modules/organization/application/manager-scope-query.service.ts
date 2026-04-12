import { Injectable } from '@nestjs/common';

import { ManagerScopeQuery } from './contracts/manager-scope.query';
import { PersonDirectoryQueryRepositoryPort } from './ports/person-directory-query.repository.port';

@Injectable()
export class ManagerScopeQueryService {
  public constructor(
    private readonly personDirectoryQueryRepository: PersonDirectoryQueryRepositoryPort,
  ) {}

  public async getManagerScope(query: ManagerScopeQuery) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    return this.personDirectoryQueryRepository.listManagerScope({
      asOf,
      managerId: query.managerId,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
