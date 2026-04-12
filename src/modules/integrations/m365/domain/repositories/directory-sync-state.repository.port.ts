import { RepositoryPort } from '@src/shared/domain/repository-port';

import { DirectorySyncState } from '../entities/directory-sync-state.entity';

export interface DirectorySyncStateRepositoryPort extends RepositoryPort<DirectorySyncState> {
  findByScope(
    provider: string,
    resourceType: string,
    scopeKey: string,
  ): Promise<DirectorySyncState | null>;
}
