import { RepositoryPort } from '@src/shared/domain/repository-port';
import { TransactionContext } from '@src/shared/domain/transaction-context';

import { Person } from '../entities/person.entity';
import { PersonId } from '../value-objects/person-id';

export interface PersonRepositoryPort extends RepositoryPort<Person> {
  /** Save the aggregate, optionally inside an existing transaction. */
  save(aggregate: Person, tx?: TransactionContext): Promise<void>;
  /** Delete the aggregate, optionally inside an existing transaction. */
  delete(id: string, tx?: TransactionContext): Promise<void>;
  findByEmail(email: string): Promise<Person | null>;
  listAll(): Promise<Person[]>;
  findByPersonId(personId: PersonId): Promise<Person | null>;
}
