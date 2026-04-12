export interface RadiusStatusDto {
  provider: 'radius';
  status: 'configured' | 'degraded' | 'not_configured';
  supportsAccountSync: boolean;
  matchStrategy: 'email' | 'none';
  linkedAccountCount: number;
  unlinkedAccountCount: number;
  lastAccountSyncAt?: string;
  lastAccountSyncOutcome?: 'succeeded' | 'failed';
  lastAccountSyncSummary?: string;
}
