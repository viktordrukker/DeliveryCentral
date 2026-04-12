export interface M365DirectoryStatusDto {
  provider: 'm365';
  status: 'configured' | 'degraded' | 'not_configured';
  supportsDirectorySync: boolean;
  supportsManagerSync: boolean;
  matchStrategy: 'email' | 'none';
  defaultOrgUnitId: string | undefined;
  linkedIdentityCount: number;
  lastDirectorySyncAt?: string;
  lastDirectorySyncOutcome?: 'succeeded' | 'failed';
  lastDirectorySyncSummary?: string;
}
