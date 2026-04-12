export interface M365DirectoryUserRecord {
  accountEnabled: boolean;
  department?: string;
  displayName: string;
  externalUserId: string;
  givenName?: string;
  jobTitle?: string;
  mail?: string;
  sourceUpdatedAt?: Date;
  surname?: string;
  userPrincipalName: string;
}
