import { DomainEvent } from '@src/shared/domain/domain-event';

import { PersonId } from '../value-objects/person-id';

export class EmployeeDeactivatedEvent implements DomainEvent {
  public readonly eventName = 'organization.employee_deactivated';
  public readonly occurredAt = new Date();

  public constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      personId: string;
    },
  ) {}

  public static from(params: { personId: PersonId }): EmployeeDeactivatedEvent {
    return new EmployeeDeactivatedEvent(params.personId.value, {
      personId: params.personId.value,
    });
  }
}
