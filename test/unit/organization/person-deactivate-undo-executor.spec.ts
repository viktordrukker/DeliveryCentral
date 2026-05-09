import { NotFoundException } from '@nestjs/common';

import { PersonDeactivateUndoExecutor } from '@src/modules/organization/application/person-deactivate-undo.executor';
import { Person } from '@src/modules/organization/domain/entities/person.entity';
import { PersonRepositoryPort } from '@src/modules/organization/domain/repositories/person-repository.port';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { UndoActionRow } from '@src/modules/undo/application/undo-action-executor.registry';

const PERSON_ID = '33333333-3333-3333-3333-333333333333';
const ACTOR = '44444444-4444-4444-4444-444444444444';
const ORG_UNIT_ID = '55555555-5555-5555-5555-555555555555';

function makePerson(status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'): Person {
  const person = Person.createEmployee(
    {
      email: 'subject@example.test',
      name: 'Test Subject',
      orgUnitId: OrgUnitId.from(ORG_UNIT_ID),
      status,
    },
    PersonId.from(PERSON_ID),
  );
  return person;
}

function buildRepo(person: Person | null): {
  repo: PersonRepositoryPort;
  saved: Person[];
} {
  const saved: Person[] = [];
  const repo = {
    findByPersonId: async (id: PersonId): Promise<Person | null> => {
      return person && person.personId.value === id.value ? person : null;
    },
    save: async (p: Person): Promise<Person> => {
      saved.push(p);
      return p;
    },
  } as unknown as PersonRepositoryPort;
  return { repo, saved };
}

function makeRow(): UndoActionRow {
  return {
    id: 'undo-2',
    actorId: ACTOR,
    actionType: 'person.deactivate',
    entityId: PERSON_ID,
    inversePayload: { previousStatus: 'ACTIVE' },
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  };
}

describe('PersonDeactivateUndoExecutor', () => {
  it('actionType is person.deactivate', () => {
    const { repo } = buildRepo(null);
    const exec = new PersonDeactivateUndoExecutor(repo);
    expect(exec.actionType).toBe('person.deactivate');
  });

  it('throws NotFound when the person is missing', async () => {
    const { repo } = buildRepo(null);
    const exec = new PersonDeactivateUndoExecutor(repo);
    await expect(exec.execute(makeRow())).rejects.toThrow(NotFoundException);
  });

  it('restores an INACTIVE person to ACTIVE and saves', async () => {
    const person = makePerson('INACTIVE');
    const { repo, saved } = buildRepo(person);
    const exec = new PersonDeactivateUndoExecutor(repo);
    await exec.execute(makeRow());
    expect(person.status).toBe('ACTIVE');
    expect(saved).toHaveLength(1);
  });

  it('is a no-op when the person is already ACTIVE (idempotent retry)', async () => {
    const person = makePerson('ACTIVE');
    const { repo, saved } = buildRepo(person);
    const exec = new PersonDeactivateUndoExecutor(repo);
    await exec.execute(makeRow());
    expect(person.status).toBe('ACTIVE');
    expect(saved).toHaveLength(0);
  });

  it('refuses to operate on a TERMINATED person (different lifecycle)', async () => {
    const person = makePerson('TERMINATED');
    const { repo, saved } = buildRepo(person);
    const exec = new PersonDeactivateUndoExecutor(repo);
    // No-op (logs debug); status stays TERMINATED, no save.
    await exec.execute(makeRow());
    expect(person.status).toBe('TERMINATED');
    expect(saved).toHaveLength(0);
  });
});
