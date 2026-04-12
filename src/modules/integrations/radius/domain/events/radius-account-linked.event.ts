export class RadiusAccountLinked {
  public constructor(
    public readonly personId: string,
    public readonly externalAccountId: string,
    public readonly matchStrategy: string,
  ) {}
}
