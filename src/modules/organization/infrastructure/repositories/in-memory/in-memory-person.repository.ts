import { Person } from '@src/modules/organization/domain/entities/person.entity';
import { PersonRepositoryPort } from '@src/modules/organization/domain/repositories/person-repository.port';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';

export class InMemoryPersonRepository implements PersonRepositoryPort {
  public constructor(private readonly items: Person[] = []) {}

  public async delete(id: string): Promise<void> {
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

  public async save(aggregate: Person): Promise<void> {
    const existingIndex = this.items.findIndex((item) => item.id === aggregate.id);
    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
