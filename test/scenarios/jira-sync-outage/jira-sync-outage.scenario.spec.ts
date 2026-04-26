import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { AssignmentStatus } from '@src/modules/assignments/domain/value-objects/assignment-status';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { JiraProjectSyncService } from '@src/modules/integrations/jira/application/jira-project-sync.service';
import { JiraStatusService } from '@src/modules/integrations/jira/application/jira-status.service';
import { JiraSyncStatusStore } from '@src/modules/integrations/jira/application/jira-sync-status.store';
import { ExternalProjectKey } from '@src/modules/project-registry/domain/value-objects/external-project-key';
import { ExternalSystemType } from '@src/modules/project-registry/domain/value-objects/external-system-type';
import { InMemoryExternalSyncStateRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-external-sync-state.repository';
import { InMemoryProjectExternalLinkRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project-external-link.repository';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';

import { FakeJiraSyncScenarioAdapter } from './fake-jira-sync-scenario.adapter';

const successProject = {
  archived: false,
  description: 'Portfolio orchestration workspace imported from Jira.',
  key: 'PORTFOLIO',
  name: 'Portfolio Orchestration',
  selfUrl: 'https://jira.example.test/rest/api/3/project/PORTFOLIO',
  webUrl: 'https://jira.example.test/projects/PORTFOLIO',
};

describe('scenario: jira sync outage safety', () => {
  it('keeps internal project and staffing truth stable when a later sync fails', async () => {
    const projectRepository = new InMemoryProjectRepository();
    const externalLinkRepository = new InMemoryProjectExternalLinkRepository();
    const externalSyncStateRepository = new InMemoryExternalSyncStateRepository();
    const assignmentRepository = new InMemoryProjectAssignmentRepository([
      ProjectAssignment.create(
        {
          allocationPercent: AllocationPercent.from(50),
          approvedAt: new Date('2025-01-12T00:00:00.000Z'),
          personId: '11111111-1111-1111-1111-111111111008',
          projectId: 'existing-internal-project',
          requestedAt: new Date('2025-01-10T00:00:00.000Z'),
          requestedByPersonId: '11111111-1111-1111-1111-111111111006',
          staffingRole: 'Lead Engineer',
          status: AssignmentStatus.booked(),
          validFrom: new Date('2025-02-01T00:00:00.000Z'),
        },
        AssignmentId.from('scenario-assignment-001'),
      ),
    ]);
    const adapter = new FakeJiraSyncScenarioAdapter([
      {
        mode: 'success',
        projects: [successProject],
      },
      {
        errorMessage: 'Jira project sync timed out after 30 seconds.',
        mode: 'failure',
      },
    ]);
    const service = new JiraProjectSyncService(
      adapter,
      projectRepository,
      externalLinkRepository,
      externalSyncStateRepository,
    );
    const statusStore = new JiraSyncStatusStore();
    const statusService = new JiraStatusService(statusStore);

    const firstResult = await service.syncProjects();
    statusStore.recordSuccess(
      `Created ${firstResult.projectsCreated}, updated ${firstResult.projectsUpdated}.`,
      new Date('2025-03-10T10:00:00.000Z'),
    );

    const importedProjectId = firstResult.syncedProjectIds[0]!;
    const importedProject = await projectRepository.findByProjectId(importedProjectId);
    const importedLink = await externalLinkRepository.findByExternalKey(
      ExternalSystemType.jira(),
      ExternalProjectKey.from('PORTFOLIO'),
    );
    const successfulSyncState = await externalSyncStateRepository.findByProjectExternalLinkId(
      importedLink!.id,
    );
    const assignmentBeforeFailure = await assignmentRepository.findByAssignmentId(
      AssignmentId.from('scenario-assignment-001'),
    );

    expect(importedProject?.name).toBe('Portfolio Orchestration');
    expect(importedProject?.projectCode).toBe('JIRA-PORTFOLIO');
    expect(importedLink?.externalUrl).toBe('https://jira.example.test/projects/PORTFOLIO');
    expect(successfulSyncState?.syncStatus).toBe('SUCCEEDED');
    expect(successfulSyncState?.lastSuccessfulSyncedAt?.toISOString()).toBe(
      successfulSyncState?.lastSyncedAt?.toISOString(),
    );
    expect(assignmentBeforeFailure?.projectId).toBe('existing-internal-project');
    expect(assignmentBeforeFailure?.status.value).toBe('APPROVED');

    await expect(service.syncProjects()).rejects.toThrow(
      'Jira project sync timed out after 30 seconds.',
    );
    statusStore.recordFailure(
      'Jira project sync timed out after 30 seconds.',
      new Date('2025-03-10T10:30:00.000Z'),
    );

    const projectAfterFailure = await projectRepository.findByProjectId(importedProjectId);
    const linkAfterFailure = await externalLinkRepository.findByExternalKey(
      ExternalSystemType.jira(),
      ExternalProjectKey.from('PORTFOLIO'),
    );
    const syncStateAfterFailure = await externalSyncStateRepository.findByProjectExternalLinkId(
      importedLink!.id,
    );
    const assignmentAfterFailure = await assignmentRepository.findByAssignmentId(
      AssignmentId.from('scenario-assignment-001'),
    );
    const status = statusService.getStatus();

    expect(projectAfterFailure?.projectId.equals(importedProjectId)).toBe(true);
    expect(projectAfterFailure?.name).toBe('Portfolio Orchestration');
    expect(linkAfterFailure?.projectId.equals(importedProjectId)).toBe(true);
    expect(syncStateAfterFailure?.syncStatus).toBe('SUCCEEDED');
    expect(syncStateAfterFailure?.lastSuccessfulSyncedAt?.toISOString()).toBe(
      successfulSyncState?.lastSuccessfulSyncedAt?.toISOString(),
    );
    expect(syncStateAfterFailure?.lastError).toBeUndefined();
    expect(assignmentAfterFailure?.assignmentId.equals(AssignmentId.from('scenario-assignment-001'))).toBe(true);
    expect(assignmentAfterFailure?.status.value).toBe('APPROVED');
    expect(status.lastProjectSyncOutcome).toBe('failed');
    expect(status.lastProjectSyncSummary).toBe('Jira project sync timed out after 30 seconds.');
  });

  it('publishes integration events on success and stops before publishing new events on outage', async () => {
    const adapter = new FakeJiraSyncScenarioAdapter([
      {
        mode: 'success',
        projects: [successProject],
      },
      {
        errorMessage: 'Jira downstream dependency unavailable.',
        mode: 'failure',
      },
    ]);
    const service = new JiraProjectSyncService(
      adapter,
      new InMemoryProjectRepository(),
      new InMemoryProjectExternalLinkRepository(),
      new InMemoryExternalSyncStateRepository(),
    );

    await service.syncProjects();
    const publishedAfterSuccess = adapter.getPublishedEvents();

    await expect(service.syncProjects()).rejects.toThrow(
      'Jira downstream dependency unavailable.',
    );

    expect(publishedAfterSuccess.length).toBe(1);
    expect(adapter.getPublishedEvents().length).toBe(1);
  });
});
