import { PrismaClient } from '@prisma/client';

import { ProjectLifecycleConflictError } from '@src/modules/project-registry/application/project-lifecycle-conflict.error';
import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ExternalSyncState } from '@src/modules/project-registry/domain/entities/external-sync-state.entity';
import { ProjectExternalLink } from '@src/modules/project-registry/domain/entities/project-external-link.entity';
import { ExternalProjectKey } from '@src/modules/project-registry/domain/value-objects/external-project-key';
import { ExternalSystemType } from '@src/modules/project-registry/domain/value-objects/external-system-type';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { PrismaExternalSyncStateRepository } from '@src/modules/project-registry/infrastructure/repositories/prisma/prisma-external-sync-state.repository';
import { PrismaProjectExternalLinkRepository } from '@src/modules/project-registry/infrastructure/repositories/prisma/prisma-project-external-link.repository';
import { PrismaProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/prisma/prisma-project.repository';
import { createTestPrismaClient } from '../../helpers/db/create-test-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';

describe('Prisma project repositories', () => {
  let prisma: PrismaClient;
  let projectRepository: PrismaProjectRepository;
  let externalLinkRepository: PrismaProjectExternalLinkRepository;
  let externalSyncStateRepository: PrismaExternalSyncStateRepository;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    projectRepository = new PrismaProjectRepository(prisma.project);
    externalLinkRepository = new PrismaProjectExternalLinkRepository(prisma.projectExternalLink);
    externalSyncStateRepository = new PrismaExternalSyncStateRepository(prisma.externalSyncState);
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates and reloads a project', async () => {
    const project = Project.create({
      description: 'Repository persistence test.',
      endsOn: new Date('2025-09-30T00:00:00.000Z'),
      name: 'Persistence Test Project',
      projectManagerId: undefined,
      projectCode: 'PRJ-REPO-1',
      startsOn: new Date('2025-05-01T00:00:00.000Z'),
      status: 'ACTIVE',
    }, ProjectId.from('94000000-0000-0000-0000-000000000011'));

    await projectRepository.save(project);

    const reloaded = await projectRepository.findByProjectCode('PRJ-REPO-1');

    expect(reloaded?.projectId.value).toBe(project.projectId.value);
    expect(reloaded?.name).toBe('Persistence Test Project');
    expect(reloaded?.startsOn?.toISOString()).toBe('2025-05-01T00:00:00.000Z');
    expect(reloaded?.endsOn?.toISOString()).toBe('2025-09-30T00:00:00.000Z');
    expect(reloaded?.version).toBe(1);
  });

  it('rejects duplicate external keys within the same external system', async () => {
    const projectOne = Project.create({ name: 'Project One', projectCode: 'PRJ-REPO-2', status: 'ACTIVE' }, ProjectId.from('94000000-0000-0000-0000-000000000021'));
    const projectTwo = Project.create({ name: 'Project Two', projectCode: 'PRJ-REPO-3', status: 'ACTIVE' }, ProjectId.from('94000000-0000-0000-0000-000000000022'));

    await projectRepository.save(projectOne);
    await projectRepository.save(projectTwo);

    await externalLinkRepository.save(
      ProjectExternalLink.create({
        externalProjectKey: ExternalProjectKey.from('ATLAS'),
        projectId: projectOne.projectId,
        systemType: ExternalSystemType.jira(),
      }, '94444444-0000-0000-0000-000000000001'),
    );

    await expect(
      externalLinkRepository.save(
        ProjectExternalLink.create({
          externalProjectKey: ExternalProjectKey.from('ATLAS'),
          projectId: projectTwo.projectId,
          systemType: ExternalSystemType.jira(),
        }, '94444444-0000-0000-0000-000000000002'),
      ),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('archives an external link without deleting the project', async () => {
    const project = Project.create({ name: 'Project Three', projectCode: 'PRJ-REPO-4', status: 'ACTIVE' }, ProjectId.from('94000000-0000-0000-0000-000000000031'));
    const link = ProjectExternalLink.create({
      externalProjectKey: ExternalProjectKey.from('BEACON'),
      projectId: project.projectId,
      systemType: ExternalSystemType.jira(),
    }, '94444444-0000-0000-0000-000000000003');

    await projectRepository.save(project);
    await externalLinkRepository.save(link);

    link.archive(new Date('2025-03-01T00:00:00.000Z'));
    await externalLinkRepository.save(link);

    const persistedProject = await projectRepository.findByProjectId(project.projectId);
    const persistedLinks = await externalLinkRepository.findByProjectId(project.projectId);

    expect(persistedProject?.projectCode).toBe('PRJ-REPO-4');
    expect(persistedLinks[0]?.archivedAt).toBeDefined();
  });

  it('persists and reloads external sync state for a linked project', async () => {
    const project = Project.create(
      { name: 'Project Sync Test', projectCode: 'PRJ-REPO-5', status: 'ACTIVE' },
      ProjectId.from('94000000-0000-0000-0000-000000000041'),
    );
    const link = ProjectExternalLink.create(
      {
        externalProjectKey: ExternalProjectKey.from('SYNC'),
        projectId: project.projectId,
        systemType: ExternalSystemType.jira(),
      },
      '94444444-0000-0000-0000-000000000004',
    );

    await projectRepository.save(project);
    await externalLinkRepository.save(link);

    await externalSyncStateRepository.save(
      ExternalSyncState.create(
        {
          lastPayloadFingerprint: 'sync-fingerprint',
          lastSuccessfulSyncedAt: new Date('2025-03-11T10:00:00.000Z'),
          lastSyncedAt: new Date('2025-03-11T10:00:00.000Z'),
          projectExternalLinkId: link.id,
          syncStatus: 'SUCCEEDED',
        },
        '95555555-0000-0000-0000-000000000001',
      ),
    );

    const reloaded = await externalSyncStateRepository.findByProjectExternalLinkId(link.id);

    expect(reloaded?.syncStatus).toBe('SUCCEEDED');
    expect(reloaded?.lastPayloadFingerprint).toBe('sync-fingerprint');
    expect(reloaded?.lastSuccessfulSyncedAt?.toISOString()).toBe('2025-03-11T10:00:00.000Z');
  });

  it('detects stale project lifecycle saves with optimistic concurrency in Prisma persistence', async () => {
    const project = Project.create(
      { name: 'Concurrent Project', projectCode: 'PRJ-REPO-6', status: 'DRAFT' },
      ProjectId.from('94000000-0000-0000-0000-000000000061'),
    );

    await projectRepository.save(project);

    const staleActivate = await projectRepository.findByProjectId(project.projectId);
    const staleClosePath = await projectRepository.findByProjectId(project.projectId);

    expect(staleActivate).not.toBeNull();
    expect(staleClosePath).not.toBeNull();

    staleActivate!.activate();
    staleClosePath!.activate();

    await projectRepository.save(staleActivate!);

    await expect(projectRepository.save(staleClosePath!)).rejects.toBeInstanceOf(
      ProjectLifecycleConflictError,
    );
  });
});
