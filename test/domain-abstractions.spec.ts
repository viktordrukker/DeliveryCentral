import { AggregateRoot } from '@src/shared/domain/aggregate-root';
import { DomainEvent } from '@src/shared/domain/domain-event';
import { Entity } from '@src/shared/domain/entity';
import { ValueObject } from '@src/shared/domain/value-object';

class TestCreatedEvent implements DomainEvent {
  public readonly occurredAt = new Date();

  public constructor(
    public readonly eventName: string,
    public readonly aggregateId: string,
    public readonly payload: Record<string, string>,
  ) {}
}

class TestValueObject extends ValueObject<{ value: string }> {
  public static create(value: string): TestValueObject {
    return new TestValueObject({ value });
  }
}

class TestAggregate extends AggregateRoot<{ name: string }> {
  public rename(name: string): void {
    this.props.name = name;
    this.addDomainEvent(
      new TestCreatedEvent('test.aggregate.renamed', this.id, {
        name,
      }),
    );
  }
}

describe('Shared domain abstractions', () => {
  it('supports entity identity', () => {
    const entity = new Entity({ value: 'sample' }, 'entity-1');

    expect(entity.id).toBe('entity-1');
  });

  it('supports value object equality', () => {
    const left = TestValueObject.create('same');
    const right = TestValueObject.create('same');

    expect(left.equals(right)).toBe(true);
  });

  it('records aggregate domain events', () => {
    const aggregate = new TestAggregate({ name: 'initial' }, 'agg-1');

    aggregate.rename('updated');

    expect(aggregate.pullDomainEvents()).toHaveLength(1);
  });
});
