import { ValueObject } from '@src/shared/domain/value-object';

type ReportingLineTypeValue = 'SOLID_LINE' | 'DOTTED_LINE' | 'FUNCTIONAL' | 'PROJECT';

export class ReportingLineType extends ValueObject<{ value: ReportingLineTypeValue }> {
  public static solidLine(): ReportingLineType {
    return new ReportingLineType({ value: 'SOLID_LINE' });
  }

  public static dottedLine(): ReportingLineType {
    return new ReportingLineType({ value: 'DOTTED_LINE' });
  }

  public static functional(): ReportingLineType {
    return new ReportingLineType({ value: 'FUNCTIONAL' });
  }

  public static project(): ReportingLineType {
    return new ReportingLineType({ value: 'PROJECT' });
  }

  public get value(): ReportingLineTypeValue {
    return this.props.value;
  }
}
