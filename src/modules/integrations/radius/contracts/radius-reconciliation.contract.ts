export interface RadiusReconciliationRecordDto {
  accountPresenceState?: string;
  candidatePersonIds: string[];
  category: 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED';
  externalAccountId: string;
  externalDisplayName?: string;
  externalEmail?: string;
  externalUsername?: string;
  lastEvaluatedAt: string;
  lastSeenAt?: string;
  matchedByStrategy?: string;
  personId?: string;
  personDisplayName?: string;
  sourceType: string;
  sourceUpdatedAt?: string;
  summary: string;
}

export interface RadiusReconciliationReviewDto {
  items: RadiusReconciliationRecordDto[];
  lastSyncAt?: string;
  lastSyncOutcome?: 'failed' | 'succeeded';
  summary: {
    ambiguous: number;
    matched: number;
    presenceDrift: number;
    total: number;
    unmatched: number;
  };
}
