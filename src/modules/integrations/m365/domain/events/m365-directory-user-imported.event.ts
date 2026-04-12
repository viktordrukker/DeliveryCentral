export class M365DirectoryUserImported {
  public constructor(
    public readonly personId: string,
    public readonly externalUserId: string,
    public readonly externalPrincipalName?: string,
  ) {}
}
