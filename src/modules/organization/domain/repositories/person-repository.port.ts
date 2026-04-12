import { RepositoryPort } from '@src/shared/domain/repository-port';

import { Person } from '../entities/person.entity';
import { PersonId } from '../value-objects/person-id';

export interface PersonRepositoryPort extends RepositoryPort<Person> {
  findByEmail(email: string): Promise<Person | null>;
  listAll(): Promise<Person[]>;
  findByPersonId(personId: PersonId): Promise<Person | null>;
}
