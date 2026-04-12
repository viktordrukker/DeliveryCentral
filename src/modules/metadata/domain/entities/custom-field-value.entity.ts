import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface CustomFieldValueProps {
  archivedAt?: Date;
  customFieldDefinitionId: string;
  entityId: string;
  entityType: string;
  value: unknown;
}

export class CustomFieldValue extends AggregateRoot<CustomFieldValueProps> {
  public static create(props: CustomFieldValueProps, id?: string): CustomFieldValue {
    return new CustomFieldValue(props, id ?? randomUUID());
  }
}
