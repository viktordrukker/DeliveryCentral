export class RadiusAccountImported {
  public constructor(
    public readonly externalAccountId: string,
    public readonly matchedPersonId?: string,
  ) {}
}
