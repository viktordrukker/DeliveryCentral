import { AggregateRoot } from '@src/shared/domain/aggregate-root';

export type CaseTypeKey = 'OFFBOARDING' | 'ONBOARDING' | 'PERFORMANCE' | 'TRANSFER';

interface CaseTypeProps {
  description?: string;
  displayName: string;
  key: CaseTypeKey;
}

const CASE_TYPE_DEFINITIONS: Record<CaseTypeKey, { description: string; displayName: string; id: string }> = {
  OFFBOARDING: { description: 'Employee or contributor offboarding workflow.', displayName: 'Offboarding', id: 'case-type-offboarding' },
  ONBOARDING: { description: 'Employee or contributor onboarding workflow.', displayName: 'Onboarding', id: 'case-type-onboarding' },
  PERFORMANCE: { description: 'Performance review or improvement plan workflow.', displayName: 'Performance Review', id: 'case-type-performance' },
  TRANSFER: { description: 'Role or department transfer workflow.', displayName: 'Transfer', id: 'case-type-transfer' },
};

export class CaseType extends AggregateRoot<CaseTypeProps> {
  public static from(key: CaseTypeKey): CaseType {
    const def = CASE_TYPE_DEFINITIONS[key];
    return new CaseType({ description: def.description, displayName: def.displayName, key }, def.id);
  }

  public static onboarding(): CaseType {
    return CaseType.from('ONBOARDING');
  }

  public get description(): string | undefined {
    return this.props.description;
  }

  public get displayName(): string {
    return this.props.displayName;
  }

  public get key(): CaseTypeKey {
    return this.props.key;
  }
}
