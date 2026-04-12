export interface RadiusAccountRecord {
  externalAccountId: string;
  username: string;
  email?: string;
  displayName?: string;
  sourceType?: string;
  accountPresenceState?: string;
  sourceUpdatedAt?: Date;
}
