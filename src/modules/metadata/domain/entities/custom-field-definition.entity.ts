import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { ValidationRule } from './validation-rule.entity';

export type MetadataFieldDataType =
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'DECIMAL'
  | 'ENUM'
  | 'JSON'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'TEXT';

const VALID_METADATA_ENTITY_TYPES = new Set([
  'Case',
  'OrgUnit',
  'Person',
  'Project',
  'ProjectAssignment',
  'WorkEvidence',
]);

interface CustomFieldDefinitionProps {
  archivedAt?: Date;
  dataType: MetadataFieldDataType;
  defaultValue?: unknown;
  description?: string;
  displayName: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  entityType: string;
  fieldKey: string;
  isEnabled?: boolean;
  isRequired?: boolean;
  metadataDictionaryId?: string;
  scopeOrgUnitId?: string;
}

export class CustomFieldDefinition extends AggregateRoot<CustomFieldDefinitionProps> {
  private readonly rules: ValidationRule[] = [];

  public static create(
    props: CustomFieldDefinitionProps,
    id?: string,
  ): CustomFieldDefinition {
    if (!VALID_METADATA_ENTITY_TYPES.has(props.entityType)) {
      throw new Error(
        `Custom field definition entity type must be one of: ${[...VALID_METADATA_ENTITY_TYPES].join(', ')}.`,
      );
    }

    return new CustomFieldDefinition(
      {
        ...props,
        isEnabled: props.isEnabled ?? true,
        isRequired: props.isRequired ?? false,
      },
      id ?? randomUUID(),
    );
  }

  public bindValidationRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  public get dataType(): MetadataFieldDataType {
    return this.props.dataType;
  }

  public get archivedAt(): Date | undefined {
    return this.props.archivedAt;
  }

  public get defaultValue(): unknown {
    return this.props.defaultValue;
  }

  public get description(): string | undefined {
    return this.props.description;
  }

  public get displayName(): string {
    return this.props.displayName;
  }

  public get entityType(): string {
    return this.props.entityType;
  }

  public get fieldKey(): string {
    return this.props.fieldKey;
  }

  public get isEnabled(): boolean {
    return this.props.isEnabled ?? true;
  }

  public get isRequired(): boolean {
    return this.props.isRequired ?? false;
  }

  public get metadataDictionaryId(): string | undefined {
    return this.props.metadataDictionaryId;
  }

  public get scopeOrgUnitId(): string | undefined {
    return this.props.scopeOrgUnitId;
  }

  public get validationRules(): ValidationRule[] {
    return [...this.rules];
  }
}
