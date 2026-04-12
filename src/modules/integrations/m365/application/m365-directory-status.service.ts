import { AppConfig } from '@src/shared/config/app-config';

import { PersonExternalIdentityLinkRepositoryPort } from '../domain/repositories/person-external-identity-link.repository.port';
import { DirectorySyncStateRepositoryPort } from '../domain/repositories/directory-sync-state.repository.port';
import { M365DirectoryStatusDto } from '../contracts/m365-directory-status.contract';

export class M365DirectoryStatusService {
  public constructor(
    private readonly personExternalIdentityLinkRepository: PersonExternalIdentityLinkRepositoryPort,
    private readonly directorySyncStateRepository: DirectorySyncStateRepositoryPort,
    private readonly appConfig: AppConfig,
  ) {}

  public async getStatus(): Promise<M365DirectoryStatusDto> {
    const syncState = await this.directorySyncStateRepository.findByScope(
      'm365',
      'directory',
      'tenant-default',
    );
    const linkedIdentityCount = await this.personExternalIdentityLinkRepository.countByProvider(
      'm365',
    );

    return {
      defaultOrgUnitId: this.appConfig.m365DirectoryDefaultOrgUnitId,
      lastDirectorySyncAt: syncState?.lastSyncedAt?.toISOString(),
      lastDirectorySyncOutcome:
        syncState?.lastStatus === 'FAILED'
          ? 'failed'
          : syncState?.lastStatus === 'SUCCEEDED'
            ? 'succeeded'
            : undefined,
      lastDirectorySyncSummary:
        syncState?.lastStatus === 'FAILED'
          ? syncState.lastError
          : syncState?.lastStatus === 'SUCCEEDED'
            ? `Linked ${linkedIdentityCount} external identities.`
            : undefined,
      linkedIdentityCount,
      matchStrategy: this.appConfig.m365DirectoryMatchStrategy,
      provider: 'm365',
      status: 'configured',
      supportsDirectorySync: true,
      supportsManagerSync: true,
    };
  }
}
