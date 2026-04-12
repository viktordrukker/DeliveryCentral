import { RadiusSyncState } from '../../../domain/entities/radius-sync-state.entity';
import { ExternalAccountLink } from '../../../domain/entities/external-account-link.entity';
import { RadiusReconciliationRecord } from '../../../domain/entities/radius-reconciliation-record.entity';

export class RadiusPrismaMapper {
  public static toExternalAccountLink(record: {
    id: string;
    personId: string | null;
    provider: string;
    sourceType: string;
    externalAccountId: string;
    externalUsername: string | null;
    externalDisplayName: string | null;
    externalEmail: string | null;
    matchedByStrategy: string | null;
    accountPresenceState: string | null;
    sourceUpdatedAt: Date | null;
    lastSeenAt: Date | null;
  }): ExternalAccountLink {
    return ExternalAccountLink.create(
      {
        accountPresenceState: record.accountPresenceState ?? undefined,
        externalAccountId: record.externalAccountId,
        externalDisplayName: record.externalDisplayName ?? undefined,
        externalEmail: record.externalEmail ?? undefined,
        externalUsername: record.externalUsername ?? undefined,
        lastSeenAt: record.lastSeenAt ?? undefined,
        matchedByStrategy: record.matchedByStrategy ?? undefined,
        personId: record.personId ?? undefined,
        provider: record.provider,
        sourceType: record.sourceType,
        sourceUpdatedAt: record.sourceUpdatedAt ?? undefined,
      },
      record.id,
    );
  }

  public static toRadiusSyncState(record: {
    id: string;
    provider: string;
    resourceType: string;
    scopeKey: string;
    lastSyncedAt: Date | null;
    lastStatus: 'FAILED' | 'IDLE' | 'PARTIAL' | 'RUNNING' | 'SUCCEEDED';
    lastError: string | null;
  }): RadiusSyncState {
    return RadiusSyncState.create(
      {
        lastError: record.lastError ?? undefined,
        lastStatus: record.lastStatus === 'PARTIAL' ? 'FAILED' : record.lastStatus,
        lastSyncedAt: record.lastSyncedAt ?? undefined,
        provider: record.provider,
        resourceType: record.resourceType,
        scopeKey: record.scopeKey,
      },
      record.id,
    );
  }

  public static toRadiusReconciliationRecord(record: {
    accountPresenceState: string | null;
    candidatePersonIds: string[];
    category: 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED';
    externalAccountId: string;
    externalDisplayName: string | null;
    externalEmail: string | null;
    externalUsername: string | null;
    id: string;
    lastEvaluatedAt: Date;
    lastSeenAt: Date | null;
    matchedByStrategy: string | null;
    personId: string | null;
    provider: string;
    sourceType: string;
    sourceUpdatedAt: Date | null;
    summary: string;
  }): RadiusReconciliationRecord {
    return RadiusReconciliationRecord.create(
      {
        accountPresenceState: record.accountPresenceState ?? undefined,
        candidatePersonIds: record.candidatePersonIds,
        category: record.category,
        externalAccountId: record.externalAccountId,
        externalDisplayName: record.externalDisplayName ?? undefined,
        externalEmail: record.externalEmail ?? undefined,
        externalUsername: record.externalUsername ?? undefined,
        lastEvaluatedAt: record.lastEvaluatedAt,
        lastSeenAt: record.lastSeenAt ?? undefined,
        matchedByStrategy: record.matchedByStrategy ?? undefined,
        personId: record.personId ?? undefined,
        provider: record.provider,
        sourceType: record.sourceType,
        sourceUpdatedAt: record.sourceUpdatedAt ?? undefined,
        summary: record.summary,
      },
      record.id,
    );
  }
}
