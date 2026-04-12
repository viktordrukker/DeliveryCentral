import { DomainEvent } from './domain-event';
import { Entity } from './entity';

export class AggregateRoot<TProps> extends Entity<TProps> {
  private readonly domainEvents: DomainEvent[] = [];

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this.domainEvents.push(domainEvent);
  }

  public pullDomainEvents(): DomainEvent[] {
    const currentEvents = [...this.domainEvents];
    this.domainEvents.length = 0;
    return currentEvents;
  }
}
