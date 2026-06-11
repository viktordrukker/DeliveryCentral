import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ProjectPositionResponseDto } from '@src/modules/project-positions/application/contracts/project-position-responses';
import { CreateProjectPositionService } from '@src/modules/project-positions/application/create-project-position.service';
import type { ProjectPositionReferenceRepositoryPort } from '@src/modules/project-positions/application/ports/project-position-reference.repository.port';
import { ProjectPosition } from '@src/modules/project-positions/domain/entities/project-position.entity';
import type { ProjectPositionRepositoryPort } from '@src/modules/project-positions/domain/repositories/project-position-repository.port';
import { ProjectPositionPrismaMapper } from '@src/modules/project-positions/infrastructure/repositories/prisma/project-position-prisma.mapper';

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const ACTOR_ID = '33333333-3333-3333-3333-333333333333';

interface Harness {
  service: CreateProjectPositionService;
  saved: ProjectPosition[];
}

function buildHarness(options: { projectExists?: boolean } = {}): Harness {
  const saved: ProjectPosition[] = [];
  const repository = {
    save: async (aggregate: ProjectPosition) => {
      saved.push(aggregate);
    },
  } as unknown as ProjectPositionRepositoryPort;
  const referenceRepository = {
    projectExists: async () => options.projectExists ?? true,
  } as unknown as ProjectPositionReferenceRepositoryPort;
  return { service: new CreateProjectPositionService(repository, referenceRepository), saved };
}

function baseCommand() {
  return {
    actorId: ACTOR_ID,
    projectId: PROJECT_ID,
    role: 'Backend Engineer',
    requiredAllocationPercent: 75,
    startDate: '2026-07-01',
    endDate: '2026-12-31',
  };
}

describe('CreateProjectPositionService — field fidelity (PR-7)', () => {
  it('threads skills + summary + priority through entity, persistence shape, and response DTO', async () => {
    const { service, saved } = buildHarness();

    const position = await service.execute({
      ...baseCommand(),
      skills: ['TypeScript', 'PostgreSQL'],
      summary: 'Replace contractor on the payments squad',
      priority: 'URGENT',
      openImmediately: true,
    });

    // Entity carries the fields.
    expect(position.skills).toEqual(['TypeScript', 'PostgreSQL']);
    expect(position.summary).toBe('Replace contractor on the payments squad');
    expect(position.priority).toBe('URGENT');
    expect(position.fillStatus.value).toBe('OPEN');

    // The persisted aggregate is the same one returned.
    expect(saved).toHaveLength(1);
    expect(saved[0]).toBe(position);

    // Prisma mapper persists them (the silent-drop boundary this PR fixes).
    expect(ProjectPositionPrismaMapper.toPersistence(position)).toMatchObject({
      skills: ['TypeScript', 'PostgreSQL'],
      summary: 'Replace contractor on the payments squad',
      priority: 'URGENT',
    });

    // Response DTO echoes them back to the caller.
    expect(ProjectPositionResponseDto.from(position)).toMatchObject({
      skills: ['TypeScript', 'PostgreSQL'],
      summary: 'Replace contractor on the payments squad',
      priority: 'URGENT',
    });
  });

  it('defaults priority to MEDIUM and skills to [] when omitted', async () => {
    const { service } = buildHarness();

    const position = await service.execute(baseCommand());

    expect(position.priority).toBe('MEDIUM');
    expect(position.skills).toEqual([]);
    expect(position.summary).toBeUndefined();
    expect(position.fillStatus.value).toBe('DRAFT');

    expect(ProjectPositionPrismaMapper.toPersistence(position)).toMatchObject({
      skills: [],
      summary: null,
      priority: 'MEDIUM',
    });
    expect(ProjectPositionResponseDto.from(position)).toMatchObject({
      skills: [],
      priority: 'MEDIUM',
    });
  });

  it('rejects an unknown project with NotFoundException', async () => {
    const { service, saved } = buildHarness({ projectExists: false });

    await expect(service.execute(baseCommand())).rejects.toBeInstanceOf(NotFoundException);
    expect(saved).toHaveLength(0);
  });

  it('rejects an end date before the start date with BadRequestException', async () => {
    const { service, saved } = buildHarness();

    await expect(
      service.execute({ ...baseCommand(), startDate: '2026-12-31', endDate: '2026-07-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(saved).toHaveLength(0);
  });
});
