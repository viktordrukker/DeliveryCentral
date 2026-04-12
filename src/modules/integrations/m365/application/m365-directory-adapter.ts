import { M365DirectoryUserImported } from '../domain/events/m365-directory-user-imported.event';
import { M365DirectoryUserLinked } from '../domain/events/m365-directory-user-linked.event';
import { M365DirectoryManagerMapped } from '../domain/events/m365-directory-manager-mapped.event';
import { M365ManagerRecord } from '../contracts/m365-manager-record.contract';
import { M365DirectoryUserRecord } from '../contracts/m365-directory-user-record.contract';

export interface MappedExternalDirectoryUser {
  accountEnabled: boolean;
  email?: string;
  externalPrincipalName: string;
  externalUserId: string;
  managerExternalUserId?: string;
  name: string;
  orgUnitId: string | undefined;
  sourceDepartment?: string;
  sourceJobTitle?: string;
  sourceUpdatedAt?: Date;
}

export interface M365DirectoryMappingConfig {
  defaultOrgUnitId: string | undefined;
  personMatchStrategy: 'email' | 'none';
}

export interface M365DirectoryAdapter {
  fetchManagers(): Promise<M365ManagerRecord[]>;
  fetchUsers(): Promise<M365DirectoryUserRecord[]>;
  mapExternalUserToInternal(
    user: M365DirectoryUserRecord,
    managers: M365ManagerRecord[],
    config: M365DirectoryMappingConfig,
  ): Promise<MappedExternalDirectoryUser>;
  publishDirectorySyncEvents(
    events: Array<
      M365DirectoryManagerMapped | M365DirectoryUserImported | M365DirectoryUserLinked
    >,
  ): Promise<void>;
}
