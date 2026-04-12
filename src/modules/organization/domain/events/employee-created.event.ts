import { DomainEvent } from '@src/shared/domain/domain-event';

import { PersonId } from '../value-objects/person-id';
import { PersonStatus } from '../entities/person.entity';

export class EmployeeCreatedEvent implements DomainEvent {
  public readonly eventName = 'organization.employee_created';
  public readonly occurredAt = new Date();

  public constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      email: string;
      name: string;
      orgUnitId: string;
      personId: string;
      status: PersonStatus;
    },
  ) {}

  public static from(params: {
    email: string;
    name: string;
    orgUnitId: string;
    personId: PersonId;
    status: PersonStatus;
  }): EmployeeCreatedEvent {
    return new EmployeeCreatedEvent(params.personId.value, {
      email: params.email,
      name: params.name,
      orgUnitId: params.orgUnitId,
      personId: params.personId.value,
      status: params.status,
    });
  }
}
