import { Injectable } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';

import { RadiusStatusDto } from '../contracts/radius-status.contract';
import { ExternalAccountLinkRepositoryPort } from '../domain/repositories/external-account-link.repository.port';
import { RadiusSyncStateRepositoryPort } from '../domain/repositories/radius-sync-state.repository.port';

@Injectable()
export class RadiusStatusService {
  public constructor(
    private readonly externalAccountLinkRepository: ExternalAccountLinkRepositoryPort,
    private readonly radiusSyncStateRepository: RadiusSyncStateRepositoryPort,
    private readonly appConfig: AppConfig,
  ) {}

  public async getStatus(): Promise<RadiusStatusDto> {
    const syncState = await this.radiusSyncStateRepository.findByScope(
      'radius',
      'accounts',
      'default',
    );
    const linkedAccountCount =
      (await this.externalAccountLinkRepository.countByProvider('radius')) -
      (await this.externalAccountLinkRepository.countUnlinkedByProvider('radius'));
    const unlinkedAccountCount = await this.externalAccountLinkRepository.countUnlinkedByProvider(
      'radius',
    );

    return {
      provider: 'radius',
      status:
        this.appConfig.radiusAccountMatchStrategy === 'none' ? 'degraded' : 'configured',
      supportsAccountSync: true,
      matchStrategy: this.appConfig.radiusAccountMatchStrategy,
      linkedAccountCount,
      unlinkedAccountCount,
      lastAccountSyncAt: syncState?.lastSyncedAt?.toISOString(),
      lastAccountSyncOutcome:
        syncState?.lastStatus === 'FAILED'
          ? 'failed'
          : syncState?.lastStatus === 'SUCCEEDED'
            ? 'succeeded'
            : undefined,
      lastAccountSyncSummary:
        syncState?.lastStatus === 'FAILED'
          ? syncState.lastError
          : `Linked ${linkedAccountCount} account references; ${unlinkedAccountCount} remain unmatched.`,
    };
  }
}
