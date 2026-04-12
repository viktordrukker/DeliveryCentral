import { M365DirectoryAdapter, M365DirectoryMappingConfig, MappedExternalDirectoryUser } from '../../application/m365-directory-adapter';
import { M365ManagerRecord } from '../../contracts/m365-manager-record.contract';
import { M365DirectoryUserRecord } from '../../contracts/m365-directory-user-record.contract';
import { M365DirectoryManagerMapped } from '../../domain/events/m365-directory-manager-mapped.event';
import { M365DirectoryUserImported } from '../../domain/events/m365-directory-user-imported.event';
import { M365DirectoryUserLinked } from '../../domain/events/m365-directory-user-linked.event';

export class InMemoryM365DirectoryAdapter implements M365DirectoryAdapter {
  private readonly publishedEvents: Array<
    M365DirectoryManagerMapped | M365DirectoryUserImported | M365DirectoryUserLinked
  > = [];

  public constructor(
    private readonly users: M365DirectoryUserRecord[] = [],
    private readonly managers: M365ManagerRecord[] = [],
  ) {}

  public async fetchManagers(): Promise<M365ManagerRecord[]> {
    return [...this.managers];
  }

  public async fetchUsers(): Promise<M365DirectoryUserRecord[]> {
    return [...this.users];
  }

  public async mapExternalUserToInternal(
    user: M365DirectoryUserRecord,
    managers: M365ManagerRecord[],
    config: M365DirectoryMappingConfig,
  ): Promise<MappedExternalDirectoryUser> {
    const manager = managers.find((item) => item.externalUserId === user.externalUserId);

    return {
      accountEnabled: user.accountEnabled,
      email: user.mail?.trim().toLowerCase() || user.userPrincipalName.trim().toLowerCase(),
      externalPrincipalName: user.userPrincipalName,
      externalUserId: user.externalUserId,
      managerExternalUserId: manager?.managerExternalUserId,
      name: user.displayName,
      orgUnitId: config.defaultOrgUnitId,
      sourceDepartment: user.department,
      sourceJobTitle: user.jobTitle,
      sourceUpdatedAt: user.sourceUpdatedAt,
    };
  }

  public async publishDirectorySyncEvents(
    events: Array<
      M365DirectoryManagerMapped | M365DirectoryUserImported | M365DirectoryUserLinked
    >,
  ): Promise<void> {
    this.publishedEvents.push(...events);
  }

  public getPublishedEvents(): Array<
    M365DirectoryManagerMapped | M365DirectoryUserImported | M365DirectoryUserLinked
  > {
    return [...this.publishedEvents];
  }
}
