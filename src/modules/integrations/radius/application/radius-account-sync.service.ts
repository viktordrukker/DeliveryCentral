import { Injectable } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';
import { PersonRepositoryPort } from '@src/modules/organization/domain/repositories/person-repository.port';

import { RadiusAccountAdapter, RadiusMappingConfig } from './radius-account-adapter';
import { ExternalAccountLink } from '../domain/entities/external-account-link.entity';
import { RadiusReconciliationRecord } from '../domain/entities/radius-reconciliation-record.entity';
import { RadiusSyncState } from '../domain/entities/radius-sync-state.entity';
import { RadiusAccountImported } from '../domain/events/radius-account-imported.event';
import { RadiusAccountLinked } from '../domain/events/radius-account-linked.event';
import { ExternalAccountLinkRepositoryPort } from '../domain/repositories/external-account-link.repository.port';
import { RadiusReconciliationRecordRepositoryPort } from '../domain/repositories/radius-reconciliation-record.repository.port';
import { RadiusSyncStateRepositoryPort } from '../domain/repositories/radius-sync-state.repository.port';

interface RadiusAccountSyncResult {
  accountsImported: number;
  accountsLinked: number;
  unmatchedAccounts: number;
  syncedAccountIds: string[];
}

@Injectable()
export class RadiusAccountSyncService {
  private readonly mappingConfig: RadiusMappingConfig;

  public constructor(
    private readonly radiusAccountAdapter: RadiusAccountAdapter,
    private readonly personRepository: PersonRepositoryPort,
    private readonly externalAccountLinkRepository: ExternalAccountLinkRepositoryPort,
    private readonly reconciliationRecordRepository: RadiusReconciliationRecordRepositoryPort,
    private readonly radiusSyncStateRepository: RadiusSyncStateRepositoryPort,
    appConfig: AppConfig,
  ) {
    this.mappingConfig = {
      personMatchStrategy: appConfig.radiusAccountMatchStrategy,
    };
  }

  public async syncAccounts(): Promise<RadiusAccountSyncResult> {
    const accounts = await this.radiusAccountAdapter.fetchAccounts();
    const normalizedEmailCounts = this.buildNormalizedEmailCounts(accounts.map((account) => account.email));
    const now = new Date();
    const syncState =
      (await this.radiusSyncStateRepository.findByScope('radius', 'accounts', 'default')) ??
      RadiusSyncState.create({
        lastStatus: 'IDLE',
        provider: 'radius',
        resourceType: 'accounts',
        scopeKey: 'default',
      });

    syncState.mark({
      lastStatus: 'RUNNING',
      lastSyncedAt: now,
    });
    await this.radiusSyncStateRepository.save(syncState);

    const events: Array<RadiusAccountImported | RadiusAccountLinked> = [];
    let accountsImported = 0;
    let accountsLinked = 0;
    let unmatchedAccounts = 0;
    const syncedAccountIds: string[] = [];
    const syncedExternalAccountIds = new Set<string>();

    try {
      for (const account of accounts) {
        syncedExternalAccountIds.add(account.externalAccountId);
        const mapped = await this.radiusAccountAdapter.mapExternalAccount(
          account,
          this.mappingConfig,
        );
        const normalizedEmail = mapped.email?.trim().toLowerCase();
        const isAmbiguousEmail =
          normalizedEmail !== undefined && (normalizedEmailCounts.get(normalizedEmail) ?? 0) > 1;

        if (isAmbiguousEmail) {
          unmatchedAccounts += 1;
          await this.upsertReconciliationRecord({
            accountPresenceState: mapped.accountPresenceState,
            category: 'AMBIGUOUS',
            externalAccountId: mapped.externalAccountId,
            externalDisplayName: mapped.displayName,
            externalEmail: mapped.email,
            externalUsername: mapped.username,
            lastEvaluatedAt: now,
            lastSeenAt: now,
            sourceType: mapped.sourceType,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
            summary:
              'RADIUS account shares an email with another synced account and requires operator review.',
          });
          syncedAccountIds.push(mapped.externalAccountId);
          continue;
        }

        const matchedPerson = await this.findMatchingPerson(mapped.email);
        const matchedPersonId = matchedPerson?.personId.value;
        const matchedByStrategy = matchedPersonId
          ? this.mappingConfig.personMatchStrategy
          : undefined;

        let link = await this.externalAccountLinkRepository.findByExternalAccountId(
          'radius',
          mapped.externalAccountId,
        );

        if (!link) {
          link = ExternalAccountLink.create({
            accountPresenceState: mapped.accountPresenceState,
            externalAccountId: mapped.externalAccountId,
            externalDisplayName: mapped.displayName,
            externalEmail: mapped.email,
            externalUsername: mapped.username,
            lastSeenAt: new Date(),
            matchedByStrategy,
            personId: matchedPersonId,
            provider: 'radius',
            sourceType: mapped.sourceType,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
          });
          accountsImported += 1;
          if (matchedPersonId) {
            accountsLinked += 1;
            events.push(
              new RadiusAccountLinked(
                matchedPersonId,
                mapped.externalAccountId,
                matchedByStrategy ?? 'unknown',
              ),
            );
          } else {
            unmatchedAccounts += 1;
          }
          events.push(new RadiusAccountImported(mapped.externalAccountId, matchedPersonId));
        } else {
          const wasLinked = Boolean(link.personId);
          link.reconcile({
            accountPresenceState: mapped.accountPresenceState,
            externalDisplayName: mapped.displayName,
            externalEmail: mapped.email,
            externalUsername: mapped.username,
            lastSeenAt: new Date(),
            matchedByStrategy,
            personId: matchedPersonId ?? link.personId,
            sourceType: mapped.sourceType,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
          });
          if (!wasLinked && matchedPersonId) {
            accountsLinked += 1;
            events.push(
              new RadiusAccountLinked(
                matchedPersonId,
                mapped.externalAccountId,
                matchedByStrategy ?? 'unknown',
              ),
            );
          }
        }

        await this.externalAccountLinkRepository.save(link);
        await this.upsertReconciliationRecord({
          accountPresenceState: mapped.accountPresenceState,
          category: matchedPersonId ? 'MATCHED' : 'UNMATCHED',
          externalAccountId: mapped.externalAccountId,
          externalDisplayName: mapped.displayName,
          externalEmail: mapped.email,
          externalUsername: mapped.username,
          lastEvaluatedAt: now,
          lastSeenAt: now,
          matchedByStrategy,
          personId: matchedPersonId ?? link.personId,
          sourceType: mapped.sourceType,
          sourceUpdatedAt: mapped.sourceUpdatedAt,
          summary: matchedPersonId
            ? 'RADIUS account presence linked safely to an internal person.'
            : 'RADIUS account presence remains unmatched and requires review.',
        });
        syncedAccountIds.push(mapped.externalAccountId);
      }

      const existingLinks = await this.externalAccountLinkRepository.listByProvider('radius');
      for (const existingLink of existingLinks) {
        if (syncedExternalAccountIds.has(existingLink.externalAccountId)) {
          continue;
        }

        await this.upsertReconciliationRecord({
          accountPresenceState: existingLink.accountPresenceState,
          category: 'PRESENCE_DRIFT',
          externalAccountId: existingLink.externalAccountId,
          externalDisplayName: existingLink.externalDisplayName,
          externalEmail: existingLink.externalEmail,
          externalUsername: existingLink.externalUsername,
          lastEvaluatedAt: now,
          lastSeenAt: existingLink.lastSeenAt,
          matchedByStrategy: existingLink.matchedByStrategy,
          personId: existingLink.personId,
          sourceType: existingLink.sourceType,
          sourceUpdatedAt: existingLink.sourceUpdatedAt,
          summary:
            'Previously linked RADIUS account was not observed in the latest account-presence sync.',
        });
      }

      syncState.mark({
        lastError: undefined,
        lastStatus: 'SUCCEEDED',
        lastSyncedAt: now,
      });
      await this.radiusSyncStateRepository.save(syncState);
      await this.radiusAccountAdapter.publishIdentitySyncEvents(events);

      return {
        accountsImported,
        accountsLinked,
        unmatchedAccounts,
        syncedAccountIds,
      };
    } catch (error) {
      syncState.mark({
        lastError: error instanceof Error ? error.message : 'RADIUS account sync failed.',
        lastStatus: 'FAILED',
        lastSyncedAt: now,
      });
      await this.radiusSyncStateRepository.save(syncState);
      throw error;
    }
  }

  private async findMatchingPerson(email?: string) {
    if (this.mappingConfig.personMatchStrategy !== 'email' || !email) {
      return null;
    }

    return this.personRepository.findByEmail(email);
  }

  private buildNormalizedEmailCounts(values: Array<string | undefined>): Map<string, number> {
    const counts = new Map<string, number>();
    for (const value of values) {
      const normalized = value?.trim().toLowerCase();
      if (!normalized) {
        continue;
      }

      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }

    return counts;
  }

  private async upsertReconciliationRecord(props: {
    accountPresenceState?: string;
    candidatePersonIds?: string[];
    category: 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED';
    externalAccountId: string;
    externalDisplayName?: string;
    externalEmail?: string;
    externalUsername?: string;
    lastEvaluatedAt: Date;
    lastSeenAt?: Date;
    matchedByStrategy?: string;
    personId?: string;
    sourceType: string;
    sourceUpdatedAt?: Date;
    summary: string;
  }): Promise<void> {
    const existing = await this.reconciliationRecordRepository.findByExternalAccountId(
      'radius',
      props.externalAccountId,
    );

    const next = {
      accountPresenceState: props.accountPresenceState,
      candidatePersonIds: props.candidatePersonIds ?? [],
      category: props.category,
      externalAccountId: props.externalAccountId,
      externalDisplayName: props.externalDisplayName,
      externalEmail: props.externalEmail,
      externalUsername: props.externalUsername,
      lastEvaluatedAt: props.lastEvaluatedAt,
      lastSeenAt: props.lastSeenAt,
      matchedByStrategy: props.matchedByStrategy,
      personId: props.personId,
      provider: 'radius',
      sourceType: props.sourceType,
      sourceUpdatedAt: props.sourceUpdatedAt,
      summary: props.summary,
    } as const;

    if (existing) {
      existing.revise(next);
      await this.reconciliationRecordRepository.save(existing);
      return;
    }

    await this.reconciliationRecordRepository.save(RadiusReconciliationRecord.create(next));
  }
}
