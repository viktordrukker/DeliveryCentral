import { PrismaProjectPositionReferenceRepository } from '@src/modules/project-positions/infrastructure/repositories/prisma/prisma-project-position-reference.repository';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const PERSON_ID = '22222222-2222-2222-2222-222222222222';

function buildHarness(counts: { project?: number; person?: number } = {}) {
  const projectWheres: Array<Record<string, unknown>> = [];
  const personWheres: Array<Record<string, unknown>> = [];

  const prisma = {
    project: {
      count: async (q: { where: Record<string, unknown> }) => {
        projectWheres.push(q.where);
        return counts.project ?? 1;
      },
    },
    person: {
      count: async (q: { where: Record<string, unknown> }) => {
        personWheres.push(q.where);
        return counts.person ?? 1;
      },
    },
  } as unknown as PrismaService;

  return {
    repository: new PrismaProjectPositionReferenceRepository(prisma),
    projectWheres,
    personWheres,
  };
}

describe('PrismaProjectPositionReferenceRepository — create-side reference probes', () => {
  it('projectExists probes by id only', async () => {
    const { repository, projectWheres } = buildHarness();

    await expect(repository.projectExists(PROJECT_ID)).resolves.toBe(true);
    expect(projectWheres[0]).toEqual({ id: PROJECT_ID });
  });

  it('projectIsActive excludes CLOSED and ARCHIVED statuses', async () => {
    const { repository, projectWheres } = buildHarness({ project: 0 });

    await expect(repository.projectIsActive(PROJECT_ID)).resolves.toBe(false);
    expect(projectWheres[0]).toEqual({
      id: PROJECT_ID,
      status: { notIn: ['CLOSED', 'ARCHIVED'] },
    });
  });

  it('personExists probes by id only', async () => {
    const { repository, personWheres } = buildHarness();

    await expect(repository.personExists(PERSON_ID)).resolves.toBe(true);
    expect(personWheres[0]).toEqual({ id: PERSON_ID });
  });

  it('personIsActive requires employmentStatus ACTIVE (excludes TERMINATED / LEAVE / INACTIVE)', async () => {
    const { repository, personWheres } = buildHarness({ person: 0 });

    await expect(repository.personIsActive(PERSON_ID)).resolves.toBe(false);
    expect(personWheres[0]).toEqual({ id: PERSON_ID, employmentStatus: 'ACTIVE' });
  });
});
