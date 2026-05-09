import { NotFoundException } from '@nestjs/common';

import { ProjectCloseUndoExecutor } from '@src/modules/project-registry/application/project-close-undo.executor';
import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ProjectRepositoryPort } from '@src/modules/project-registry/domain/repositories/project-repository.port';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { UndoActionRow } from '@src/modules/undo/application/undo-action-executor.registry';

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const ACTOR = '22222222-2222-2222-2222-222222222222';

function makeProject(status: 'ACTIVE' | 'CLOSED' | 'DRAFT'): Project {
  return Project.create(
    {
      name: 'Test Project',
      projectCode: 'TEST',
      status,
    },
    ProjectId.from(PROJECT_ID),
  );
}

function buildRepo(project: Project | null): {
  repo: ProjectRepositoryPort;
  saved: Project[];
} {
  const saved: Project[] = [];
  const repo = {
    findByProjectId: async (id: ProjectId): Promise<Project | null> => {
      return project && project.projectId.value === id.value ? project : null;
    },
    save: async (p: Project): Promise<Project> => {
      saved.push(p);
      return p;
    },
  } as unknown as ProjectRepositoryPort;
  return { repo, saved };
}

function makeRow(): UndoActionRow {
  return {
    id: 'undo-1',
    actorId: ACTOR,
    actionType: 'project.close',
    entityId: PROJECT_ID,
    inversePayload: { previousStatus: 'ACTIVE' },
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  };
}

describe('ProjectCloseUndoExecutor', () => {
  it('actionType is project.close', () => {
    const { repo } = buildRepo(null);
    const exec = new ProjectCloseUndoExecutor(repo);
    expect(exec.actionType).toBe('project.close');
  });

  it('throws NotFound when the project is missing', async () => {
    const { repo } = buildRepo(null);
    const exec = new ProjectCloseUndoExecutor(repo);
    await expect(exec.execute(makeRow())).rejects.toThrow(NotFoundException);
  });

  it('reopens a CLOSED project to ACTIVE and saves', async () => {
    const project = makeProject('CLOSED');
    const { repo, saved } = buildRepo(project);
    const exec = new ProjectCloseUndoExecutor(repo);
    await exec.execute(makeRow());
    expect(project.status).toBe('ACTIVE');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toBe(project);
  });

  it('is a no-op when the project is no longer CLOSED (idempotent retry safety)', async () => {
    const project = makeProject('ACTIVE');
    const { repo, saved } = buildRepo(project);
    const exec = new ProjectCloseUndoExecutor(repo);
    await exec.execute(makeRow());
    expect(project.status).toBe('ACTIVE');
    expect(saved).toHaveLength(0);
  });
});
