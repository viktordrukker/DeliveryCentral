import { PrismaService } from '@src/shared/persistence/prisma.service';
import {
  M365DirectoryReconciliationRecordDto,
  M365DirectoryReconciliationReviewDto,
} from '../contracts/m365-directory-reconciliation.contract';
import { DirectorySyncStateRepositoryPort } from '../domain/repositories/directory-sync-state.repository.port';
import { M365DirectoryReconciliationRecordRepositoryPort } from '../domain/repositories/m365-directory-reconciliation-record.repository.port';

interface M365DirectoryReconciliationFilter {
  category?: 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED';
  query?: string;
}

export class M365DirectoryReconciliationQueryService {
  public constructor(
    private readonly reconciliationRecordRepository: M365DirectoryReconciliationRecordRepositoryPort,
    private readonly directorySyncStateRepository: DirectorySyncStateRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  public async getReview(
    filter: M365DirectoryReconciliationFilter = {},
  ): Promise<M365DirectoryReconciliationReviewDto> {
    const [records, syncState] = await Promise.all([
      this.reconciliationRecordRepository.listByProvider('m365'),
      this.directorySyncStateRepository.findByScope('m365', 'directory', 'tenant-default'),
    ]);

    const personIds = [...new Set(records.map((r) => r.personId).filter((id): id is string => Boolean(id)))];
    const dbPeople = personIds.length > 0
      ? await this.prisma.person.findMany({ select: { id: true, displayName: true }, where: { id: { in: personIds } } })
      : [];
    const peopleById = new Map(dbPeople.map((p) => [p.id, p.displayName]));

    const normalizedQuery = filter.query?.trim().toLowerCase();
    const items = records
      .filter((record) => {
        if (filter.category && record.category !== filter.category) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [
          record.externalDisplayName,
          record.externalEmail,
          record.externalPrincipalName,
          record.externalUserId,
          record.personId,
          record.summary,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => right.lastEvaluatedAt.getTime() - left.lastEvaluatedAt.getTime())
      .map<M365DirectoryReconciliationRecordDto>((record) => ({
        candidatePersonIds: record.candidatePersonIds,
        category: record.category,
        externalDisplayName: record.externalDisplayName,
        externalEmail: record.externalEmail,
        externalPrincipalName: record.externalPrincipalName,
        externalUserId: record.externalUserId,
        lastEvaluatedAt: record.lastEvaluatedAt.toISOString(),
        lastSeenAt: record.lastSeenAt?.toISOString(),
        matchedByStrategy: record.matchedByStrategy,
        personId: record.personId,
        personDisplayName: record.personId ? peopleById.get(record.personId) : undefined,
        resolvedManagerPersonId: record.resolvedManagerPersonId,
        sourceAccountEnabled: record.sourceAccountEnabled,
        sourceDepartment: record.sourceDepartment,
        sourceJobTitle: record.sourceJobTitle,
        sourceUpdatedAt: record.sourceUpdatedAt?.toISOString(),
        summary: record.summary,
      }));

    const summary = records.reduce(
      (aggregate, record) => {
        aggregate.total += 1;
        switch (record.category) {
          case 'MATCHED':
            aggregate.matched += 1;
            break;
          case 'UNMATCHED':
            aggregate.unmatched += 1;
            break;
          case 'AMBIGUOUS':
            aggregate.ambiguous += 1;
            break;
          case 'STALE_CONFLICT':
            aggregate.staleConflict += 1;
            break;
        }
        return aggregate;
      },
      {
        ambiguous: 0,
        matched: 0,
        staleConflict: 0,
        total: 0,
        unmatched: 0,
      },
    );

    return {
      items,
      lastSyncAt: syncState?.lastSyncedAt?.toISOString(),
      lastSyncOutcome:
        syncState?.lastStatus === 'FAILED'
          ? 'failed'
          : syncState?.lastStatus === 'SUCCEEDED'
            ? 'succeeded'
            : undefined,
      summary,
    };
  }
}
