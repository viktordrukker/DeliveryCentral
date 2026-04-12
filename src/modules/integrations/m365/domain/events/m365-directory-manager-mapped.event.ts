export class M365DirectoryManagerMapped {
  public constructor(
    public readonly personId: string,
    public readonly externalUserId: string,
    public readonly resolvedManagerPersonId: string,
  ) {}
}
