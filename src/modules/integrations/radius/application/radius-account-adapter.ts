import { RadiusAccountImported } from '../domain/events/radius-account-imported.event';
import { RadiusAccountLinked } from '../domain/events/radius-account-linked.event';
import { RadiusAccountRecord } from '../contracts/radius-account-record.contract';

export interface RadiusMappingConfig {
  personMatchStrategy: 'email' | 'none';
}

export interface MappedRadiusAccount {
  accountPresenceState?: string;
  displayName?: string;
  email?: string;
  externalAccountId: string;
  sourceType: string;
  sourceUpdatedAt?: Date;
  username: string;
}

export interface RadiusAccountAdapter {
  fetchAccounts(): Promise<RadiusAccountRecord[]>;
  mapExternalAccount(
    account: RadiusAccountRecord,
    config: RadiusMappingConfig,
  ): Promise<MappedRadiusAccount>;
  publishIdentitySyncEvents(
    events: Array<RadiusAccountImported | RadiusAccountLinked>,
  ): Promise<void>;
}
