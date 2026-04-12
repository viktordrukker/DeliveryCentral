export class M365DirectoryUserLinked {
  public constructor(
    public readonly personId: string,
    public readonly externalUserId: string,
    public readonly matchedByStrategy: string,
  ) {}
}
