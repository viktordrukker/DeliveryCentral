export abstract class ValueObject<TProps> {
  protected constructor(protected readonly props: TProps) {}

  public equals(other?: ValueObject<TProps>): boolean {
    if (!other) {
      return false;
    }

    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  public unpack(): TProps {
    return this.props;
  }
}
