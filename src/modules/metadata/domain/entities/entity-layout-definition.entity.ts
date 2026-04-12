import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface EntityLayoutDefinitionProps {
  archivedAt?: Date;
  displayName: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  entityType: string;
  isDefault?: boolean;
  layoutKey: string;
  layoutSchema: Record<string, unknown>;
  scopeOrgUnitId?: string;
  version: number;
}

export class EntityLayoutDefinition extends AggregateRoot<EntityLayoutDefinitionProps> {
  public static create(props: EntityLayoutDefinitionProps, id?: string): EntityLayoutDefinition {
    return new EntityLayoutDefinition(
      {
        ...props,
        isDefault: props.isDefault ?? false,
      },
      id ?? randomUUID(),
    );
  }
}
