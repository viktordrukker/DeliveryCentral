import { LinkExternalProjectService } from '@src/modules/project-registry/application/link-external-project.service';
import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ProjectExternalLink } from '@src/modules/project-registry/domain/entities/project-external-link.entity';
import { ExternalProjectKey } from '@src/modules/project-registry/domain/value-objects/external-project-key';
import { ExternalSystemType } from '@src/modules/project-registry/domain/value-objects/external-system-type';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { InMemoryProjectExternalLinkRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project-external-link.repository';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { expectDomainError } from '../../helpers/domain-assertions.helper';

describe('project registry domain invariants', () => {
  it('keeps project identity internal and separate from external links', () => {
    const project = Project.create(
      {
        description: 'Internal project identity.',
        name: 'Delivery Central Platform',
        projectCode: 'PRJ-101',
        status: 'ACTIVE',
      },
      ProjectId.from('project-1'),
    );
    const link = ProjectExternalLink.create({
      externalProjectKey: ExternalProjectKey.from('DELCENT'),
      externalProjectName: 'Delivery Central Platform Jira',
      externalUrl: 'https://jira.example.com/projects/DELCENT',
      projectId: project.projectId,
      systemType: ExternalSystemType.jira(),
    }, 'link-1');

    expect(project.projectId.value).toBe('project-1');
    expect(link.projectId.value).toBe(project.projectId.value);
    expect(link.externalProjectKey.value).toBe('DELCENT');
    expect(project.projectCode).toBe('PRJ-101');
  });

  it('keeps the internal project identity stable when external metadata changes', () => {
    const project = Project.create(
      {
        name: 'Atlas ERP Rollout',
        projectCode: 'PRJ-102',
        status: 'ACTIVE',
      },
      ProjectId.from('project-2'),
    );
    const link = ProjectExternalLink.create({
      externalProjectKey: ExternalProjectKey.from('ATLAS'),
      externalProjectName: 'Atlas ERP Rollout',
      projectId: project.projectId,
      systemType: ExternalSystemType.jira(),
    }, 'link-2');

    link.enrich({ externalProjectName: 'Atlas ERP Rollout - Renamed' });

    expect(project.projectId.value).toBe('project-2');
    expect(project.name).toBe('Atlas ERP Rollout');
    expect(link.externalProjectName).toBe('Atlas ERP Rollout - Renamed');
  });

  it('rejects duplicate external project keys within the same external system', async () => {
    const firstProject = Project.create(
      { name: 'Atlas', projectCode: 'PRJ-001', status: 'ACTIVE' },
      ProjectId.from('project-1'),
    );
    const secondProject = Project.create(
      { name: 'Beacon', projectCode: 'PRJ-002', status: 'ACTIVE' },
      ProjectId.from('project-2'),
    );
    const projectRepository = new InMemoryProjectRepository([firstProject, secondProject]);
    const linkRepository = new InMemoryProjectExternalLinkRepository([
      ProjectExternalLink.create({
        externalProjectKey: ExternalProjectKey.from('ATLAS'),
        projectId: firstProject.projectId,
        systemType: ExternalSystemType.jira(),
      }, 'link-existing'),
    ]);
    const service = new LinkExternalProjectService(projectRepository, linkRepository);

    await expectDomainError(
      () =>
        service.execute({
          externalProjectKey: ExternalProjectKey.from('ATLAS'),
          projectId: secondProject.projectId,
          systemType: ExternalSystemType.jira(),
        }),
      'External project key is already linked to a different internal project.',
    );
  });
});
