import { CreateEmployeeService } from '@src/modules/organization/application/create-employee.service';
import { PersonRepositoryPort } from '@src/modules/organization/domain/repositories/person-repository.port';
import { AppConfig } from '@src/shared/config/app-config';

import { M365DirectoryAdapter, M365DirectoryMappingConfig } from './m365-directory-adapter';
import { M365DirectoryReconciliationRecord } from '../domain/entities/m365-directory-reconciliation-record.entity';
import { PersonExternalIdentityLink } from '../domain/entities/person-external-identity-link.entity';
import { DirectorySyncState } from '../domain/entities/directory-sync-state.entity';
import { DirectorySyncStateRepositoryPort } from '../domain/repositories/directory-sync-state.repository.port';
import { M365DirectoryReconciliationRecordRepositoryPort } from '../domain/repositories/m365-directory-reconciliation-record.repository.port';
import { PersonExternalIdentityLinkRepositoryPort } from '../domain/repositories/person-external-identity-link.repository.port';
import { M365DirectoryManagerMapped } from '../domain/events/m365-directory-manager-mapped.event';
import { M365DirectoryUserImported } from '../domain/events/m365-directory-user-imported.event';
import { M365DirectoryUserLinked } from '../domain/events/m365-directory-user-linked.event';

interface M365DirectorySyncResult {
  employeesCreated: number;
  employeesLinked: number;
  managerMappingsResolved: number;
  syncedPersonIds: string[];
}

export class M365DirectorySyncService {
  private readonly mappingConfig: M365DirectoryMappingConfig;

  public constructor(
    private readonly directoryAdapter: M365DirectoryAdapter,
    private readonly personRepository: PersonRepositoryPort,
    private readonly createEmployeeService: CreateEmployeeService,
    private readonly personExternalIdentityLinkRepository: PersonExternalIdentityLinkRepositoryPort,
    private readonly reconciliationRecordRepository: M365DirectoryReconciliationRecordRepositoryPort,
    private readonly directorySyncStateRepository: DirectorySyncStateRepositoryPort,
    appConfig: AppConfig,
  ) {
    this.mappingConfig = {
      defaultOrgUnitId: appConfig.m365DirectoryDefaultOrgUnitId,
      personMatchStrategy: appConfig.m365DirectoryMatchStrategy,
    };
  }

  public async syncDirectory(): Promise<M365DirectorySyncResult> {
    if (!this.mappingConfig.defaultOrgUnitId) {
      throw new Error(
        'M365 directory sync requires M365_DIRECTORY_DEFAULT_ORG_UNIT_ID to be configured.',
      );
    }

    const users = await this.directoryAdapter.fetchUsers();
    const managers = await this.directoryAdapter.fetchManagers();
    const mappedUsers = await Promise.all(
      users.map((user) =>
        this.directoryAdapter.mapExternalUserToInternal(user, managers, this.mappingConfig),
      ),
    );
    const duplicateEmails = this.findDuplicateEmails(mappedUsers.map((item) => item.email));
    const now = new Date();
    const syncState =
      (await this.directorySyncStateRepository.findByScope('m365', 'directory', 'tenant-default')) ??
      DirectorySyncState.create({
        lastStatus: 'IDLE',
        provider: 'm365',
        resourceType: 'directory',
        scopeKey: 'tenant-default',
      });

    syncState.mark({
      lastStatus: 'RUNNING',
      lastSyncedAt: now,
    });
    await this.directorySyncStateRepository.save(syncState);

    const events: Array<
      M365DirectoryManagerMapped | M365DirectoryUserImported | M365DirectoryUserLinked
    > = [];
    const pendingManagerResolutions: Array<{
      externalManagerUserId?: string;
      externalUserId: string;
      link: PersonExternalIdentityLink;
      personId: string;
    }> = [];
    const syncedPersonIds: string[] = [];
    let employeesCreated = 0;
    let employeesLinked = 0;
    let managerMappingsResolved = 0;
    const syncedExternalUserIds = new Set<string>();

    try {
      for (const mapped of mappedUsers) {
        syncedExternalUserIds.add(mapped.externalUserId);

        let link = await this.personExternalIdentityLinkRepository.findByExternalUserId(
          'm365',
          mapped.externalUserId,
        );

        if (link) {
          link.reconcile({
            externalManagerUserId: mapped.managerExternalUserId,
            externalPrincipalName: mapped.externalPrincipalName,
            lastSeenAt: new Date(),
            matchedByStrategy: link.matchedByStrategy,
            sourceAccountEnabled: mapped.accountEnabled,
            sourceDepartment: mapped.sourceDepartment,
            sourceJobTitle: mapped.sourceJobTitle,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
          });
          await this.personExternalIdentityLinkRepository.save(link);
          await this.upsertReconciliationRecord({
            category:
              mapped.managerExternalUserId && !link.resolvedManagerPersonId
                ? 'STALE_CONFLICT'
                : 'MATCHED',
            externalDisplayName: mapped.name,
            externalEmail: mapped.email,
            externalPrincipalName: mapped.externalPrincipalName,
            externalUserId: mapped.externalUserId,
            lastEvaluatedAt: now,
            lastSeenAt: new Date(),
            matchedByStrategy: link.matchedByStrategy,
            personId: link.personId,
            resolvedManagerPersonId: link.resolvedManagerPersonId,
            sourceAccountEnabled: mapped.accountEnabled,
            sourceDepartment: mapped.sourceDepartment,
            sourceJobTitle: mapped.sourceJobTitle,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
            summary:
              mapped.managerExternalUserId && !link.resolvedManagerPersonId
                ? 'External identity is linked, but the manager reference is not yet resolved internally.'
                : 'External identity matched an existing linked person.',
          });
          syncedPersonIds.push(link.personId);
          pendingManagerResolutions.push({
            externalManagerUserId: mapped.managerExternalUserId,
            externalUserId: mapped.externalUserId,
            link,
            personId: link.personId,
          });
          continue;
        }

        if (!mapped.externalPrincipalName.trim() && !(mapped.email ?? '').trim()) {
          await this.upsertReconciliationRecord({
            category: 'UNMATCHED',
            externalDisplayName: mapped.name,
            externalEmail: mapped.email,
            externalPrincipalName: mapped.externalPrincipalName,
            externalUserId: mapped.externalUserId,
            lastEvaluatedAt: now,
            lastSeenAt: new Date(),
            sourceAccountEnabled: mapped.accountEnabled,
            sourceDepartment: mapped.sourceDepartment,
            sourceJobTitle: mapped.sourceJobTitle,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
            summary:
              'External identity could not be safely reconciled because no usable principal or email was provided.',
          });
          continue;
        }

        if (mapped.email && duplicateEmails.has(mapped.email.trim().toLowerCase())) {
          await this.upsertReconciliationRecord({
            category: 'AMBIGUOUS',
            externalDisplayName: mapped.name,
            externalEmail: mapped.email,
            externalPrincipalName: mapped.externalPrincipalName,
            externalUserId: mapped.externalUserId,
            lastEvaluatedAt: now,
            lastSeenAt: new Date(),
            sourceAccountEnabled: mapped.accountEnabled,
            sourceDepartment: mapped.sourceDepartment,
            sourceJobTitle: mapped.sourceJobTitle,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
            summary:
              'External identity shares an email with another synced M365 record and requires operator review.',
          });
          continue;
        }

        const existingPerson = await this.findMatchingPerson(mapped.email);

        if (existingPerson) {
          const existingPersonLink =
            await this.personExternalIdentityLinkRepository.findByPersonId(
              'm365',
              existingPerson.personId.value,
            );
          if (existingPersonLink && existingPersonLink.externalUserId !== mapped.externalUserId) {
            await this.upsertReconciliationRecord({
              candidatePersonIds: [existingPerson.personId.value],
              category: 'AMBIGUOUS',
              externalDisplayName: mapped.name,
              externalEmail: mapped.email,
              externalPrincipalName: mapped.externalPrincipalName,
              externalUserId: mapped.externalUserId,
              lastEvaluatedAt: now,
              lastSeenAt: new Date(),
              matchedByStrategy: this.mappingConfig.personMatchStrategy,
              personId: existingPerson.personId.value,
              sourceAccountEnabled: mapped.accountEnabled,
              sourceDepartment: mapped.sourceDepartment,
              sourceJobTitle: mapped.sourceJobTitle,
              sourceUpdatedAt: mapped.sourceUpdatedAt,
              summary:
                'External identity matched an internal person that is already linked to a different M365 identity.',
            });
            continue;
          }

          link = PersonExternalIdentityLink.create({
            externalManagerUserId: mapped.managerExternalUserId,
            externalPrincipalName: mapped.externalPrincipalName,
            externalUserId: mapped.externalUserId,
            lastSeenAt: new Date(),
            matchedByStrategy: this.mappingConfig.personMatchStrategy,
            personId: existingPerson.personId.value,
            provider: 'm365',
            sourceAccountEnabled: mapped.accountEnabled,
            sourceDepartment: mapped.sourceDepartment,
            sourceJobTitle: mapped.sourceJobTitle,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
          });
          await this.personExternalIdentityLinkRepository.save(link);
          await this.upsertReconciliationRecord({
            category:
              mapped.managerExternalUserId && !link.resolvedManagerPersonId
                ? 'STALE_CONFLICT'
                : 'MATCHED',
            externalDisplayName: mapped.name,
            externalEmail: mapped.email,
            externalPrincipalName: mapped.externalPrincipalName,
            externalUserId: mapped.externalUserId,
            lastEvaluatedAt: now,
            lastSeenAt: new Date(),
            matchedByStrategy: this.mappingConfig.personMatchStrategy,
            personId: existingPerson.personId.value,
            sourceAccountEnabled: mapped.accountEnabled,
            sourceDepartment: mapped.sourceDepartment,
            sourceJobTitle: mapped.sourceJobTitle,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
            summary:
              mapped.managerExternalUserId && !link.resolvedManagerPersonId
                ? 'External identity linked to an internal person, but manager resolution still needs review.'
                : 'External identity linked to an existing internal person.',
          });
          employeesLinked += 1;
          syncedPersonIds.push(existingPerson.personId.value);
          events.push(
            new M365DirectoryUserLinked(
              existingPerson.personId.value,
              mapped.externalUserId,
              this.mappingConfig.personMatchStrategy,
            ),
          );
          pendingManagerResolutions.push({
            externalManagerUserId: mapped.managerExternalUserId,
            externalUserId: mapped.externalUserId,
            link,
            personId: existingPerson.personId.value,
          });
          continue;
        }

        try {
          const createdPerson = await this.createEmployeeService.execute({
            email: mapped.email ?? mapped.externalPrincipalName,
            name: mapped.name,
            orgUnitId: mapped.orgUnitId ?? '',
            role: mapped.sourceJobTitle,
            status: 'INACTIVE',
          });
          link = PersonExternalIdentityLink.create({
            externalManagerUserId: mapped.managerExternalUserId,
            externalPrincipalName: mapped.externalPrincipalName,
            externalUserId: mapped.externalUserId,
            lastSeenAt: new Date(),
            matchedByStrategy: 'created_new',
            personId: createdPerson.personId.value,
            provider: 'm365',
            sourceAccountEnabled: mapped.accountEnabled,
            sourceDepartment: mapped.sourceDepartment,
            sourceJobTitle: mapped.sourceJobTitle,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
          });
          await this.personExternalIdentityLinkRepository.save(link);
          await this.upsertReconciliationRecord({
            category:
              mapped.managerExternalUserId && !link.resolvedManagerPersonId
                ? 'STALE_CONFLICT'
                : 'MATCHED',
            externalDisplayName: mapped.name,
            externalEmail: mapped.email,
            externalPrincipalName: mapped.externalPrincipalName,
            externalUserId: mapped.externalUserId,
            lastEvaluatedAt: now,
            lastSeenAt: new Date(),
            matchedByStrategy: 'created_new',
            personId: createdPerson.personId.value,
            sourceAccountEnabled: mapped.accountEnabled,
            sourceDepartment: mapped.sourceDepartment,
            sourceJobTitle: mapped.sourceJobTitle,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
            summary:
              mapped.managerExternalUserId && !link.resolvedManagerPersonId
                ? 'External identity created a new internal person, but manager resolution still needs review.'
                : 'External identity created a new internal person safely.',
          });
          employeesCreated += 1;
          syncedPersonIds.push(createdPerson.personId.value);
          events.push(
            new M365DirectoryUserImported(
              createdPerson.personId.value,
              mapped.externalUserId,
              mapped.externalPrincipalName,
            ),
          );
          pendingManagerResolutions.push({
            externalManagerUserId: mapped.managerExternalUserId,
            externalUserId: mapped.externalUserId,
            link,
            personId: createdPerson.personId.value,
          });
        } catch (error) {
          await this.upsertReconciliationRecord({
            category: 'UNMATCHED',
            externalDisplayName: mapped.name,
            externalEmail: mapped.email,
            externalPrincipalName: mapped.externalPrincipalName,
            externalUserId: mapped.externalUserId,
            lastEvaluatedAt: now,
            lastSeenAt: new Date(),
            sourceAccountEnabled: mapped.accountEnabled,
            sourceDepartment: mapped.sourceDepartment,
            sourceJobTitle: mapped.sourceJobTitle,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
            summary:
              error instanceof Error
                ? `External identity could not be created safely: ${error.message}`
                : 'External identity could not be created safely.',
          });
        }
      }

      for (const pending of pendingManagerResolutions) {
        if (!pending.externalManagerUserId) {
          continue;
        }

        const managerLink = await this.personExternalIdentityLinkRepository.findByExternalUserId(
          'm365',
          pending.externalManagerUserId,
        );
        if (!managerLink) {
          continue;
        }

        pending.link.reconcile({
          externalManagerUserId: pending.externalManagerUserId,
          externalPrincipalName: pending.link.externalPrincipalName,
          lastSeenAt: pending.link.lastSeenAt ?? new Date(),
          matchedByStrategy: pending.link.matchedByStrategy,
          resolvedManagerPersonId: managerLink.personId,
          sourceAccountEnabled: pending.link.sourceAccountEnabled,
          sourceDepartment: pending.link.sourceDepartment,
          sourceJobTitle: pending.link.sourceJobTitle,
          sourceUpdatedAt: pending.link.sourceUpdatedAt,
        });
        await this.personExternalIdentityLinkRepository.save(pending.link);
        await this.upsertReconciliationRecord({
          category: 'MATCHED',
          externalDisplayName: undefined,
          externalEmail: undefined,
          externalPrincipalName: pending.link.externalPrincipalName,
          externalUserId: pending.externalUserId,
          lastEvaluatedAt: now,
          lastSeenAt: pending.link.lastSeenAt ?? now,
          matchedByStrategy: pending.link.matchedByStrategy,
          personId: pending.personId,
          resolvedManagerPersonId: managerLink.personId,
          sourceAccountEnabled: pending.link.sourceAccountEnabled,
          sourceDepartment: pending.link.sourceDepartment,
          sourceJobTitle: pending.link.sourceJobTitle,
          sourceUpdatedAt: pending.link.sourceUpdatedAt,
          summary: 'External identity and manager mapping resolved to internal records.',
        });
        managerMappingsResolved += 1;
        events.push(
          new M365DirectoryManagerMapped(
            pending.personId,
            pending.externalUserId,
            managerLink.personId,
          ),
        );
      }

      const existingLinks = await this.personExternalIdentityLinkRepository.listByProvider('m365');
      for (const existingLink of existingLinks) {
        if (syncedExternalUserIds.has(existingLink.externalUserId)) {
          continue;
        }

        await this.upsertReconciliationRecord({
          category: 'STALE_CONFLICT',
          externalEmail: undefined,
          externalPrincipalName: existingLink.externalPrincipalName,
          externalUserId: existingLink.externalUserId,
          lastEvaluatedAt: now,
          lastSeenAt: existingLink.lastSeenAt,
          matchedByStrategy: existingLink.matchedByStrategy,
          personId: existingLink.personId,
          resolvedManagerPersonId: existingLink.resolvedManagerPersonId,
          sourceAccountEnabled: existingLink.sourceAccountEnabled,
          sourceDepartment: existingLink.sourceDepartment,
          sourceJobTitle: existingLink.sourceJobTitle,
          sourceUpdatedAt: existingLink.sourceUpdatedAt,
          summary: 'Linked M365 identity was not observed in the latest sync and should be reviewed for drift.',
        });
      }

      syncState.mark({
        lastError: undefined,
        lastStatus: 'SUCCEEDED',
        lastSyncedAt: now,
      });
      await this.directorySyncStateRepository.save(syncState);
      await this.directoryAdapter.publishDirectorySyncEvents(events);

      return {
        employeesCreated,
        employeesLinked,
        managerMappingsResolved,
        syncedPersonIds,
      };
    } catch (error) {
      syncState.mark({
        lastError: error instanceof Error ? error.message : 'M365 directory sync failed.',
        lastStatus: 'FAILED',
        lastSyncedAt: now,
      });
      await this.directorySyncStateRepository.save(syncState);
      throw error;
    }
  }

  private async findMatchingPerson(email?: string) {
    if (this.mappingConfig.personMatchStrategy !== 'email' || !email) {
      return null;
    }

    return this.personRepository.findByEmail(email);
  }

  private findDuplicateEmails(values: Array<string | undefined>): Set<string> {
    const counts = new Map<string, number>();
    for (const value of values) {
      const normalized = value?.trim().toLowerCase();
      if (!normalized) {
        continue;
      }

      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }

    return new Set(
      [...counts.entries()].filter(([, count]) => count > 1).map(([email]) => email),
    );
  }

  private async upsertReconciliationRecord(props: {
    candidatePersonIds?: string[];
    category: 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED';
    externalDisplayName?: string;
    externalEmail?: string;
    externalPrincipalName?: string;
    externalUserId: string;
    lastEvaluatedAt: Date;
    lastSeenAt?: Date;
    matchedByStrategy?: string;
    personId?: string;
    resolvedManagerPersonId?: string;
    sourceAccountEnabled?: boolean;
    sourceDepartment?: string;
    sourceJobTitle?: string;
    sourceUpdatedAt?: Date;
    summary: string;
  }): Promise<void> {
    const existing = await this.reconciliationRecordRepository.findByExternalUserId(
      'm365',
      props.externalUserId,
    );

    const next = {
      candidatePersonIds: props.candidatePersonIds ?? [],
      category: props.category,
      externalDisplayName: props.externalDisplayName,
      externalEmail: props.externalEmail,
      externalPrincipalName: props.externalPrincipalName,
      externalUserId: props.externalUserId,
      lastEvaluatedAt: props.lastEvaluatedAt,
      lastSeenAt: props.lastSeenAt,
      matchedByStrategy: props.matchedByStrategy,
      personId: props.personId,
      provider: 'm365',
      resolvedManagerPersonId: props.resolvedManagerPersonId,
      sourceAccountEnabled: props.sourceAccountEnabled,
      sourceDepartment: props.sourceDepartment,
      sourceJobTitle: props.sourceJobTitle,
      sourceUpdatedAt: props.sourceUpdatedAt,
      summary: props.summary,
    } as const;

    if (existing) {
      existing.revise(next);
      await this.reconciliationRecordRepository.save(existing);
      return;
    }

    await this.reconciliationRecordRepository.save(M365DirectoryReconciliationRecord.create(next));
  }
}
