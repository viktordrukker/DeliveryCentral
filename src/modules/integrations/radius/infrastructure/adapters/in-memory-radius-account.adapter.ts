import {
  MappedRadiusAccount,
  RadiusAccountAdapter,
  RadiusMappingConfig,
} from '../../application/radius-account-adapter';
import { RadiusAccountRecord } from '../../contracts/radius-account-record.contract';
import { RadiusAccountImported } from '../../domain/events/radius-account-imported.event';
import { RadiusAccountLinked } from '../../domain/events/radius-account-linked.event';

export class InMemoryRadiusAccountAdapter implements RadiusAccountAdapter {
  private readonly publishedEvents: Array<RadiusAccountImported | RadiusAccountLinked> = [];

  public constructor(private readonly accounts: RadiusAccountRecord[] = []) {}

  public async fetchAccounts(): Promise<RadiusAccountRecord[]> {
    return [...this.accounts];
  }

  public async mapExternalAccount(
    account: RadiusAccountRecord,
    _config: RadiusMappingConfig,
  ): Promise<MappedRadiusAccount> {
    return {
      accountPresenceState: account.accountPresenceState,
      displayName: account.displayName,
      email: account.email?.trim().toLowerCase(),
      externalAccountId: account.externalAccountId,
      sourceType: account.sourceType ?? 'radius_account',
      sourceUpdatedAt: account.sourceUpdatedAt,
      username: account.username,
    };
  }

  public async publishIdentitySyncEvents(
    events: Array<RadiusAccountImported | RadiusAccountLinked>,
  ): Promise<void> {
    this.publishedEvents.push(...events);
  }

  public getPublishedEvents(): Array<RadiusAccountImported | RadiusAccountLinked> {
    return [...this.publishedEvents];
  }
}
