import { Person } from '@src/modules/organization/domain/entities/person.entity';
import { PersonRepositoryPort } from '@src/modules/organization/domain/repositories/person-repository.port';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { TransactionContext } from '@src/shared/domain/transaction-context';

export class InMemoryPersonRepository implements PersonRepositoryPort {
  public constructor(private readonly items: Person[] = []) {}

  // In-memory impl ignores `tx` — there is no atomic boundary to honor.
  public async delete(id: string, _tx?: TransactionContext): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findById(id: string): Promise<Person | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async findByPersonId(personId: PersonId): Promise<Person | null> {
    return this.items.find((item) => item.personId.equals(personId)) ?? null;
  }

  public async findByEmail(email: string): Promise<Person | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return (
      this.items.find(
        (item) => item.primaryEmail?.trim().toLowerCase() === normalizedEmail,
      ) ?? null
    );
  }

  public async listAll(): Promise<Person[]> {
    return [...this.items];
  }

  public async save(aggregate: Person, _tx?: TransactionContext): Promise<void> {
    const existingIndex = this.items.findIndex((item) => item.id === aggregate.id);
    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
