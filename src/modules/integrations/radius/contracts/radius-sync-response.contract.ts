export interface RadiusSyncResponseDto {
  accountsImported: number;
  accountsLinked: number;
  unmatchedAccounts: number;
  syncedAccountIds: string[];
}
