export interface DomainEvent {
  readonly aggregateId: string;
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
}
