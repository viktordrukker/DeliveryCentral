export interface M365DirectoryReconciliationRecordDto {
  category: 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED';
  candidatePersonIds: string[];
  externalDisplayName?: string;
  externalEmail?: string;
  externalPrincipalName?: string;
  externalUserId: string;
  lastEvaluatedAt: string;
  lastSeenAt?: string;
  matchedByStrategy?: string;
  personId?: string;
  resolvedManagerPersonId?: string;
  sourceAccountEnabled?: boolean;
  sourceDepartment?: string;
  sourceJobTitle?: string;
  sourceUpdatedAt?: string;
  summary: string;
}

export interface M365DirectoryReconciliationReviewDto {
  items: M365DirectoryReconciliationRecordDto[];
  lastSyncAt?: string;
  lastSyncOutcome?: 'failed' | 'succeeded';
  summary: {
    ambiguous: number;
    matched: number;
    staleConflict: number;
    total: number;
    unmatched: number;
  };
}
