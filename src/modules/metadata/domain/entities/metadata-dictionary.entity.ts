import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface MetadataDictionaryProps {
  archivedAt?: Date;
  description?: string;
  dictionaryKey: string;
  displayName: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  entityType: string;
  isSystemManaged?: boolean;
  scopeOrgUnitId?: string;
}

export class MetadataDictionary extends AggregateRoot<MetadataDictionaryProps> {
  public static create(props: MetadataDictionaryProps, id?: string): MetadataDictionary {
    return new MetadataDictionary(
      {
        ...props,
        isSystemManaged: props.isSystemManaged ?? false,
      },
      id ?? randomUUID(),
    );
  }

  public archive(archivedAt: Date): void {
    this.props.archivedAt = archivedAt;
  }

  public get dictionaryKey(): string {
    return this.props.dictionaryKey;
  }

  public get displayName(): string {
    return this.props.displayName;
  }

  public get description(): string | undefined {
    return this.props.description;
  }

  public get entityType(): string {
    return this.props.entityType;
  }

  public get isSystemManaged(): boolean {
    return this.props.isSystemManaged ?? false;
  }

  public get archivedAt(): Date | undefined {
    return this.props.archivedAt;
  }

  public get scopeOrgUnitId(): string | undefined {
    return this.props.scopeOrgUnitId;
  }
}
