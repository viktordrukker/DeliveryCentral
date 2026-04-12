import { ArchiveProjectService } from '@src/modules/project-registry/application/archive-project.service';
import { CreateProjectService } from '@src/modules/project-registry/application/create-project.service';
import { LinkExternalProjectService } from '@src/modules/project-registry/application/link-external-project.service';
import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ExternalProjectKey } from '@src/modules/project-registry/domain/value-objects/external-project-key';
import { ExternalSystemType } from '@src/modules/project-registry/domain/value-objects/external-system-type';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { InMemoryProjectExternalLinkRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project-external-link.repository';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';

describe('Project Registry', () => {
  it('creates an internal project manually with its own identity', async () => {
    const projectRepository = new InMemoryProjectRepository();
    const service = new CreateProjectService(projectRepository);

    const project = await service.execute({
      name: 'Internal Staffing Platform',
      projectCode: 'PRJ-001',
    });

    expect(project.projectId).toBeInstanceOf(ProjectId);
    expect(project.projectCode).toBe('PRJ-001');
    expect(project.archivedAt).toBeUndefined();
  });

  it('prevents duplicate external key linkage within the same system', async () => {
    const projectRepository = new InMemoryProjectRepository([
      Project.create({ name: 'Alpha', projectCode: 'PRJ-001' }, ProjectId.from('20000000-0000-0000-0000-000000000001')),
      Project.create({ name: 'Beta', projectCode: 'PRJ-002' }, ProjectId.from('20000000-0000-0000-0000-000000000002')),
    ]);
    const linkRepository = new InMemoryProjectExternalLinkRepository();
    const service = new LinkExternalProjectService(projectRepository, linkRepository);

    await service.execute({
      externalProjectKey: ExternalProjectKey.from('JIRA-123'),
      externalUrl: 'https://jira.example.com/projects/JIRA-123',
      projectId: ProjectId.from('20000000-0000-0000-0000-000000000001'),
      systemType: ExternalSystemType.jira(),
    });

    await expect(
      service.execute({
        externalProjectKey: ExternalProjectKey.from('JIRA-123'),
        externalUrl: 'https://jira.example.com/projects/JIRA-123',
        projectId: ProjectId.from('20000000-0000-0000-0000-000000000002'),
        systemType: ExternalSystemType.jira(),
      }),
    ).rejects.toThrow('External project key is already linked to a different internal project.');
  });

  it('keeps the internal project identity stable when external metadata changes', async () => {
    const projectId = ProjectId.from('20000000-0000-0000-0000-000000000010');
    const projectRepository = new InMemoryProjectRepository([
      Project.create({ name: 'Imported Project', projectCode: 'PRJ-010' }, projectId),
    ]);
    const linkRepository = new InMemoryProjectExternalLinkRepository();
    const service = new LinkExternalProjectService(projectRepository, linkRepository);

    const initialLink = await service.execute({
      externalProjectKey: ExternalProjectKey.from('JIRA-100'),
      externalProjectName: 'Old Jira Name',
      externalUrl: 'https://jira.example.com/projects/JIRA-100',
      projectId,
      systemType: ExternalSystemType.jira(),
    });

    const updatedLink = await service.execute({
      externalProjectKey: ExternalProjectKey.from('JIRA-100'),
      externalProjectName: 'New Jira Name',
      externalUrl: 'https://jira.example.com/projects/JIRA-100-renamed',
      projectId,
      systemType: ExternalSystemType.jira(),
    });

    expect(initialLink.projectId.equals(projectId)).toBe(true);
    expect(updatedLink.projectId.equals(projectId)).toBe(true);
    expect(updatedLink.externalProjectName).toBe('New Jira Name');
  });

  it('archives an external link while keeping the internal project active', async () => {
    const projectId = ProjectId.from('20000000-0000-0000-0000-000000000020');
    const projectRepository = new InMemoryProjectRepository([
      Project.create({ name: 'Link Archive', projectCode: 'PRJ-020' }, projectId),
    ]);
    const linkRepository = new InMemoryProjectExternalLinkRepository();
    const linkService = new LinkExternalProjectService(projectRepository, linkRepository);
    const projectArchiveService = new ArchiveProjectService(projectRepository);

    const link = await linkService.execute({
      externalProjectKey: ExternalProjectKey.from('JIRA-200'),
      projectId,
      systemType: ExternalSystemType.jira(),
    });

    link.archive(new Date('2025-01-10T00:00:00.000Z'));
    await linkRepository.save(link);

    const persistedProject = await projectRepository.findByProjectId(projectId);
    const persistedLink = await linkRepository.findByExternalKey(
      ExternalSystemType.jira(),
      ExternalProjectKey.from('JIRA-200'),
    );

    expect(persistedProject?.archivedAt).toBeUndefined();
    expect(persistedLink?.archivedAt?.toISOString()).toBe('2025-01-10T00:00:00.000Z');

    await projectArchiveService.execute({
      projectId,
      archivedAt: new Date('2025-02-01T00:00:00.000Z'),
    });

    const archivedProject = await projectRepository.findByProjectId(projectId);
    expect(archivedProject?.archivedAt?.toISOString()).toBe('2025-02-01T00:00:00.000Z');
  });
});
