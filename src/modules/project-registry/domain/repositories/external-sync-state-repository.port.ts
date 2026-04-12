import { RepositoryPort } from '@src/shared/domain/repository-port';

import { ExternalSyncState } from '../entities/external-sync-state.entity';

export interface ExternalSyncStateRepositoryPort extends RepositoryPort<ExternalSyncState> {
  findByProjectExternalLinkId(projectExternalLinkId: string): Promise<ExternalSyncState | null>;
}
