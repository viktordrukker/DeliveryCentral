import { PrismaService } from '@src/shared/persistence/prisma.service';
import {
  RadiusReconciliationRecordDto,
  RadiusReconciliationReviewDto,
} from '../contracts/radius-reconciliation.contract';
import { RadiusReconciliationRecordRepositoryPort } from '../domain/repositories/radius-reconciliation-record.repository.port';
import { RadiusSyncStateRepositoryPort } from '../domain/repositories/radius-sync-state.repository.port';

interface RadiusReconciliationFilter {
  category?: 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED';
  query?: string;
}

export class RadiusReconciliationQueryService {
  public constructor(
    private readonly reconciliationRecordRepository: RadiusReconciliationRecordRepositoryPort,
    private readonly radiusSyncStateRepository: RadiusSyncStateRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  public async getReview(
    filter: RadiusReconciliationFilter = {},
  ): Promise<RadiusReconciliationReviewDto> {
    const [records, syncState] = await Promise.all([
      this.reconciliationRecordRepository.listByProvider('radius'),
      this.radiusSyncStateRepository.findByScope('radius', 'accounts', 'default'),
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
          record.externalAccountId,
          record.externalDisplayName,
          record.externalEmail,
          record.externalUsername,
          record.personId,
          record.summary,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => right.lastEvaluatedAt.getTime() - left.lastEvaluatedAt.getTime())
      .map<RadiusReconciliationRecordDto>((record) => ({
        accountPresenceState: record.accountPresenceState,
        candidatePersonIds: record.candidatePersonIds,
        category: record.category,
        externalAccountId: record.externalAccountId,
        externalDisplayName: record.externalDisplayName,
        externalEmail: record.externalEmail,
        externalUsername: record.externalUsername,
        lastEvaluatedAt: record.lastEvaluatedAt.toISOString(),
        lastSeenAt: record.lastSeenAt?.toISOString(),
        matchedByStrategy: record.matchedByStrategy,
        personId: record.personId,
        personDisplayName: record.personId ? peopleById.get(record.personId) : undefined,
        sourceType: record.sourceType,
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
          case 'PRESENCE_DRIFT':
            aggregate.presenceDrift += 1;
            break;
        }
        return aggregate;
      },
      {
        ambiguous: 0,
        matched: 0,
        presenceDrift: 0,
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
