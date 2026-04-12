import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface ValidationRuleProps {
  fieldKey: string;
  ruleKey: string;
  ruleSchema: Record<string, unknown>;
}

export class ValidationRule extends AggregateRoot<ValidationRuleProps> {
  public static create(props: ValidationRuleProps, id?: string): ValidationRule {
    return new ValidationRule(props, id ?? randomUUID());
  }

  public get fieldKey(): string {
    return this.props.fieldKey;
  }

  public get ruleKey(): string {
    return this.props.ruleKey;
  }

  public get ruleSchema(): Record<string, unknown> {
    return this.props.ruleSchema;
  }
}
