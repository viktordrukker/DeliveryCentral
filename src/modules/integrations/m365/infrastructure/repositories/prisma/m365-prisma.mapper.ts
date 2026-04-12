import { DirectorySyncState } from '../../../domain/entities/directory-sync-state.entity';
import { M365DirectoryReconciliationRecord } from '../../../domain/entities/m365-directory-reconciliation-record.entity';
import { PersonExternalIdentityLink } from '../../../domain/entities/person-external-identity-link.entity';

export class M365PrismaMapper {
  public static toDirectorySyncState(record: {
    id: string;
    lastError: string | null;
    lastStatus: 'FAILED' | 'IDLE' | 'PARTIAL' | 'RUNNING' | 'SUCCEEDED';
    lastSyncedAt: Date | null;
    provider: string;
    resourceType: string;
    scopeKey: string;
  }): DirectorySyncState {
    return DirectorySyncState.create(
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

  public static toPersonExternalIdentityLink(record: {
    id: string;
    personId: string;
    provider: string;
    externalUserId: string;
    externalPrincipalName: string | null;
    matchedByStrategy: string;
    sourceDepartment: string | null;
    sourceJobTitle: string | null;
    sourceAccountEnabled: boolean | null;
    externalManagerUserId: string | null;
    resolvedManagerPersonId: string | null;
    sourceUpdatedAt: Date | null;
    lastSeenAt: Date | null;
  }): PersonExternalIdentityLink {
    return PersonExternalIdentityLink.create(
      {
        externalManagerUserId: record.externalManagerUserId ?? undefined,
        externalPrincipalName: record.externalPrincipalName ?? undefined,
        externalUserId: record.externalUserId,
        lastSeenAt: record.lastSeenAt ?? undefined,
        matchedByStrategy: record.matchedByStrategy,
        personId: record.personId,
        provider: record.provider,
        resolvedManagerPersonId: record.resolvedManagerPersonId ?? undefined,
        sourceAccountEnabled: record.sourceAccountEnabled ?? undefined,
        sourceDepartment: record.sourceDepartment ?? undefined,
        sourceJobTitle: record.sourceJobTitle ?? undefined,
        sourceUpdatedAt: record.sourceUpdatedAt ?? undefined,
      },
      record.id,
    );
  }

  public static toM365DirectoryReconciliationRecord(record: {
    candidatePersonIds: string[];
    category: 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED';
    externalDisplayName: string | null;
    externalEmail: string | null;
    externalPrincipalName: string | null;
    externalUserId: string;
    id: string;
    lastEvaluatedAt: Date;
    lastSeenAt: Date | null;
    matchedByStrategy: string | null;
    personId: string | null;
    provider: string;
    resolvedManagerPersonId: string | null;
    sourceAccountEnabled: boolean | null;
    sourceDepartment: string | null;
    sourceJobTitle: string | null;
    sourceUpdatedAt: Date | null;
    summary: string;
  }): M365DirectoryReconciliationRecord {
    return M365DirectoryReconciliationRecord.create(
      {
        candidatePersonIds: record.candidatePersonIds,
        category: record.category,
        externalDisplayName: record.externalDisplayName ?? undefined,
        externalEmail: record.externalEmail ?? undefined,
        externalPrincipalName: record.externalPrincipalName ?? undefined,
        externalUserId: record.externalUserId,
        lastEvaluatedAt: record.lastEvaluatedAt,
        lastSeenAt: record.lastSeenAt ?? undefined,
        matchedByStrategy: record.matchedByStrategy ?? undefined,
        personId: record.personId ?? undefined,
        provider: record.provider,
        resolvedManagerPersonId: record.resolvedManagerPersonId ?? undefined,
        sourceAccountEnabled: record.sourceAccountEnabled ?? undefined,
        sourceDepartment: record.sourceDepartment ?? undefined,
        sourceJobTitle: record.sourceJobTitle ?? undefined,
        sourceUpdatedAt: record.sourceUpdatedAt ?? undefined,
        summary: record.summary,
      },
      record.id,
    );
  }
}
