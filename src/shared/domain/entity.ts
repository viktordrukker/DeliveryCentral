export class Entity<TProps> {
  public constructor(
    protected readonly props: TProps,
    protected readonly _id: string,
  ) {}

  public get id(): string {
    return this._id;
  }

  public equals(object?: Entity<TProps>): boolean {
    if (!object) {
      return false;
    }

    return this.id === object.id;
  }
}
