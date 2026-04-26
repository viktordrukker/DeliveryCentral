import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ExternalProjectKey } from '@src/modules/project-registry/domain/value-objects/external-project-key';
import { ExternalSystemType } from '@src/modules/project-registry/domain/value-objects/external-system-type';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { InMemoryProjectExternalLinkRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project-external-link.repository';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { JiraProjectSyncService } from '@src/modules/integrations/jira/application/jira-project-sync.service';
import { InMemoryJiraProjectAdapter } from '@src/modules/integrations/jira/infrastructure/adapters/in-memory-jira-project.adapter';
import { JiraProjectRecord } from '@src/modules/integrations/jira/contracts/jira-project-record.contract';
import { InMemoryExternalSyncStateRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-external-sync-state.repository';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { AssignmentStatus } from '@src/modules/assignments/domain/value-objects/assignment-status';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';

const jiraRecord = (overrides: Partial<JiraProjectRecord> = {}): JiraProjectRecord => ({
  archived: false,
  description: 'Imported from Jira',
  key: 'JIRA-101',
  name: 'Jira Project',
  selfUrl: 'https://jira.example.com/rest/api/3/project/JIRA-101',
  webUrl: 'https://jira.example.com/projects/JIRA-101',
  ...overrides,
});

describe('Jira project sync', () => {
  it('maps a new Jira project into an internal project and external link', async () => {
    const projectRepository = new InMemoryProjectRepository();
    const linkRepository = new InMemoryProjectExternalLinkRepository();
    const syncStateRepository = new InMemoryExternalSyncStateRepository();
    const adapter = new InMemoryJiraProjectAdapter([jiraRecord()]);
    const service = new JiraProjectSyncService(
      adapter,
      projectRepository,
      linkRepository,
      syncStateRepository,
    );

    const result = await service.syncProjects();

    expect(result.projectsCreated).toBe(1);
    const links = await linkRepository.findByProjectId(result.syncedProjectIds[0]!);
    expect(links[0]?.externalProjectKey.value).toBe('JIRA-101');
    expect(links[0]?.systemType.equals(ExternalSystemType.jira())).toBe(true);
  });

  it('updates an existing project link when Jira metadata changes', async () => {
    const projectId = ProjectId.from('70000000-0000-0000-0000-000000000001');
    const projectRepository = new InMemoryProjectRepository([
      Project.create({ name: 'Stable Internal Project', projectCode: 'PRJ-700' }, projectId),
    ]);
    const linkRepository = new InMemoryProjectExternalLinkRepository();
    const syncStateRepository = new InMemoryExternalSyncStateRepository();
    const adapter = new InMemoryJiraProjectAdapter([
      jiraRecord({ name: 'Original Name' }),
      jiraRecord({ name: 'Renamed in Jira', webUrl: 'https://jira.example.com/projects/RENAMED' }),
    ], { progressiveFetch: true });
    const service = new JiraProjectSyncService(
      adapter,
      projectRepository,
      linkRepository,
      syncStateRepository,
      {
        projectCodePrefix: 'JIRA',
      },
      {
        'JIRA:JIRA-101': projectId.value,
      },
    );

    const first = await service.syncProjects();
    const second = await service.syncProjects();
    const linked = await linkRepository.findByExternalKey(
      ExternalSystemType.jira(),
      ExternalProjectKey.from('JIRA-101'),
    );
    const persistedProject = await projectRepository.findByProjectId(projectId);

    expect(first.syncedProjectIds[0]?.equals(projectId)).toBe(true);
    expect(second.projectsUpdated).toBe(1);
    expect(linked?.projectId.equals(projectId)).toBe(true);
    expect(linked?.externalProjectName).toBe('Renamed in Jira');
    expect(persistedProject?.projectId.equals(projectId)).toBe(true);
    expect(persistedProject?.name).toBe('Renamed in Jira');
  });

  it('handles archived Jira projects by archiving the external link only', async () => {
    const projectRepository = new InMemoryProjectRepository();
    const linkRepository = new InMemoryProjectExternalLinkRepository();
    const syncStateRepository = new InMemoryExternalSyncStateRepository();
    const adapter = new InMemoryJiraProjectAdapter([
      jiraRecord(),
      jiraRecord({ archived: true }),
    ], { progressiveFetch: true });
    const service = new JiraProjectSyncService(
      adapter,
      projectRepository,
      linkRepository,
      syncStateRepository,
    );

    const first = await service.syncProjects();
    await service.syncProjects();

    const project = await projectRepository.findByProjectId(first.syncedProjectIds[0]!);
    const link = await linkRepository.findByExternalKey(
      ExternalSystemType.jira(),
      ExternalProjectKey.from('JIRA-101'),
    );

    expect(project?.archivedAt).toBeUndefined();
    expect(link?.archivedAt).toBeDefined();
  });

  it('rejects duplicate external keys mapped to different internal projects', async () => {
    const projectA = Project.create(
      { name: 'Alpha', projectCode: 'PRJ-A' },
      ProjectId.from('70000000-0000-0000-0000-000000000011'),
    );
    const projectB = Project.create(
      { name: 'Beta', projectCode: 'PRJ-B' },
      ProjectId.from('70000000-0000-0000-0000-000000000012'),
    );
    const service = new JiraProjectSyncService(
      new InMemoryJiraProjectAdapter([jiraRecord()]),
      new InMemoryProjectRepository([projectA, projectB]),
      new InMemoryProjectExternalLinkRepository(),
      new InMemoryExternalSyncStateRepository(),
      undefined,
      {
        'JIRA:JIRA-101': projectA.id,
      },
      {
        'JIRA:JIRA-101': projectB.id,
      },
    );

    await expect(service.syncProjects()).rejects.toThrow(
      'Duplicate external Jira key mapped to multiple internal projects.',
    );
  });

  it('rejects duplicate external keys returned by the adapter in a single sync batch', async () => {
    const service = new JiraProjectSyncService(
      new InMemoryJiraProjectAdapter([jiraRecord(), jiraRecord()]),
      new InMemoryProjectRepository(),
      new InMemoryProjectExternalLinkRepository(),
      new InMemoryExternalSyncStateRepository(),
    );

    await expect(service.syncProjects()).rejects.toThrow(
      'Duplicate external Jira project key returned by adapter.',
    );
  });

  it('does not mutate staffing assignments during Jira sync', async () => {
    const assignment = ProjectAssignment.create(
      {
        allocationPercent: AllocationPercent.from(50),
        approvedAt: new Date('2025-01-01T00:00:00.000Z'),
        personId: 'person-1',
        projectId: 'existing-project',
        requestedAt: new Date('2024-12-20T00:00:00.000Z'),
        staffingRole: 'Engineer',
        status: AssignmentStatus.booked(),
        validFrom: new Date('2025-01-01T00:00:00.000Z'),
      },
      AssignmentId.from('80000000-0000-0000-0000-000000000001'),
    );
    const assignmentRepository = new InMemoryProjectAssignmentRepository([assignment]);
    const service = new JiraProjectSyncService(
      new InMemoryJiraProjectAdapter([jiraRecord()]),
      new InMemoryProjectRepository(),
      new InMemoryProjectExternalLinkRepository(),
      new InMemoryExternalSyncStateRepository(),
    );

    await service.syncProjects();
    const persistedAssignment = await assignmentRepository.findByAssignmentId(assignment.assignmentId);

    expect(persistedAssignment?.assignmentId.equals(assignment.assignmentId)).toBe(true);
    expect(persistedAssignment?.status.equals(AssignmentStatus.booked())).toBe(true);
  });
});

describe('Jira project sync API', () => {
  it('POST /integrations/jira/projects/sync runs end-to-end with the fake adapter', async () => {
    const adapter = new InMemoryJiraProjectAdapter([
      jiraRecord({
        key: 'JIRA-201',
        name: 'Operations Console',
        webUrl: 'https://jira.example.com/projects/JIRA-201',
      }),
    ]);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InMemoryJiraProjectAdapter)
      .useValue(adapter)
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .post('/integrations/jira/projects/sync')
      .expect(200);

    const projectRepository = app.get(InMemoryProjectRepository);
    const linkRepository = app.get(InMemoryProjectExternalLinkRepository);
    const syncedProject = await projectRepository.findByProjectCode('JIRA-JIRA-201');
    const externalLink = await linkRepository.findByExternalKey(
      ExternalSystemType.jira(),
      ExternalProjectKey.from('JIRA-201'),
    );

    expect(response.body.projectsCreated).toBe(1);
    expect(syncedProject?.name).toBe('Operations Console');
    expect(externalLink?.externalUrl).toBe('https://jira.example.com/projects/JIRA-201');

    await app.close();
  });
});
