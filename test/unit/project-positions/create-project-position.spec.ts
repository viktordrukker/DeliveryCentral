import { ConflictException, NotFoundException } from '@nestjs/common';

import {
  CreateProjectPositionService,
  CreateProjectPositionCommand,
} from '@src/modules/project-positions/application/create-project-position.service';
import type { ProjectPositionReferenceRepositoryPort } from '@src/modules/project-positions/application/ports/project-position-reference.repository.port';
import { ProjectPosition } from '@src/modules/project-positions/domain/entities/project-position.entity';
import type { ProjectPositionRepositoryPort } from '@src/modules/project-positions/domain/repositories/project-position-repository.port';

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const PERSON_ID = '22222222-2222-2222-2222-222222222222';
const ACTOR_ID = '33333333-3333-3333-3333-333333333333';

interface Harness {
  service: CreateProjectPositionService;
  saves: ProjectPosition[];
  referenceCalls: string[];
}

function buildHarness(options: {
  projectExists?: boolean;
  projectIsActive?: boolean;
  personExists?: boolean;
  personIsActive?: boolean;
} = {}): Harness {
  const saves: ProjectPosition[] = [];
  const referenceCalls: string[] = [];

  const repository = {
    save: async (aggregate: ProjectPosition) => {
      saves.push(aggregate);
    },
  } as unknown as ProjectPositionRepositoryPort;

  const referenceRepository: ProjectPositionReferenceRepositoryPort = {
    projectExists: async () => {
      referenceCalls.push('projectExists');
      return options.projectExists ?? true;
    },
    projectIsActive: async () => {
      referenceCalls.push('projectIsActive');
      return options.projectIsActive ?? true;
    },
    personExists: async () => {
      referenceCalls.push('personExists');
      return options.personExists ?? true;
    },
    personIsActive: async () => {
      referenceCalls.push('personIsActive');
      return options.personIsActive ?? true;
    },
  };

  return {
    service: new CreateProjectPositionService(repository, referenceRepository),
    saves,
    referenceCalls,
  };
}

// No public getter on the aggregate — same props access as the Prisma mapper.
function requestedBy(position: ProjectPosition): string | undefined {
  return (position as unknown as { props: { requestedByPersonId?: string } }).props
    .requestedByPersonId;
}

function baseCommand(): CreateProjectPositionCommand {
  return {
    actorId: ACTOR_ID,
    projectId: PROJECT_ID,
    role: 'Engineer',
    requiredAllocationPercent: 80,
    startDate: '2026-07-01',
    endDate: '2026-12-31',
  };
}

describe('CreateProjectPositionService — reference validation (PR-8)', () => {
  it('rejects an unknown project with a 404 NotFoundException and saves nothing', async () => {
    const { service, saves } = buildHarness({ projectExists: false });

    await expect(service.execute(baseCommand())).rejects.toBeInstanceOf(NotFoundException);

    expect(saves).toHaveLength(0);
  });

  it('rejects a closed/archived project with a 409 ConflictException and saves nothing', async () => {
    const { service, saves } = buildHarness({ projectIsActive: false });

    await expect(service.execute(baseCommand())).rejects.toBeInstanceOf(ConflictException);

    expect(saves).toHaveLength(0);
  });

  it('rejects an unknown requestedByPersonId with a 404 NotFoundException', async () => {
    const { service, saves } = buildHarness({ personExists: false });

    await expect(
      service.execute({ ...baseCommand(), requestedByPersonId: PERSON_ID }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(saves).toHaveLength(0);
  });

  it('rejects a terminated/non-active requestedByPersonId with a 409 ConflictException', async () => {
    const { service, saves } = buildHarness({ personIsActive: false });

    await expect(
      service.execute({ ...baseCommand(), requestedByPersonId: PERSON_ID }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(saves).toHaveLength(0);
  });

  it('creates the position when the project is active and no explicit person is supplied — person checks are skipped (actorId fallback may be a userId)', async () => {
    const { service, saves, referenceCalls } = buildHarness();

    const position = await service.execute(baseCommand());

    expect(saves).toHaveLength(1);
    expect(position.fillStatus.value).toBe('DRAFT');
    expect(requestedBy(position)).toBe(ACTOR_ID);
    expect(referenceCalls).toEqual(['projectExists', 'projectIsActive']);
  });

  it('creates the position when an explicit requestedByPersonId passes both person checks', async () => {
    const { service, saves, referenceCalls } = buildHarness();

    const position = await service.execute({ ...baseCommand(), requestedByPersonId: PERSON_ID });

    expect(saves).toHaveLength(1);
    expect(requestedBy(position)).toBe(PERSON_ID);
    expect(referenceCalls).toEqual([
      'projectExists',
      'projectIsActive',
      'personExists',
      'personIsActive',
    ]);
  });
});
