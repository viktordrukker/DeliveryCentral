import { RepositoryPort } from '@src/shared/domain/repository-port';

import { RadiusSyncState } from '../entities/radius-sync-state.entity';

export interface RadiusSyncStateRepositoryPort extends RepositoryPort<RadiusSyncState> {
  findByScope(
    provider: string,
    resourceType: string,
    scopeKey: string,
  ): Promise<RadiusSyncState | null>;
}
