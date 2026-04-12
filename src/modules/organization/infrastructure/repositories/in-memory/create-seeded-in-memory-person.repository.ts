import { demoPeople } from '../../../../../../prisma/seeds/demo-dataset';
import { Person } from '../../../domain/entities/person.entity';
import { PersonId } from '../../../domain/value-objects/person-id';
import { InMemoryPersonRepository } from './in-memory-person.repository';

export function createSeededInMemoryPersonRepository(): InMemoryPersonRepository {
  return new InMemoryPersonRepository(
    demoPeople.map((person) =>
      Person.register(
        {
          displayName: person.displayName,
          employmentStatus:
            person.employmentStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
          familyName: person.familyName,
          grade: person.grade,
          givenName: person.givenName,
          orgUnitId: undefined,
          primaryEmail: person.primaryEmail,
          role: person.role,
          skillsets: [],
        },
        PersonId.from(person.id),
      ),
    ),
  );
}
