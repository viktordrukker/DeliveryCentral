import { CreateProjectService } from '@src/modules/project-registry/application/create-project.service';
import { LinkExternalProjectService } from '@src/modules/project-registry/application/link-external-project.service';
import { UpdateExternalSyncStateService } from '@src/modules/project-registry/application/update-external-sync-state.service';
import { ExternalProjectKey } from '@src/modules/project-registry/domain/value-objects/external-project-key';
import { ExternalSystemType } from '@src/modules/project-registry/domain/value-objects/external-system-type';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { ExternalSyncStateRepositoryPort } from '@src/modules/project-registry/domain/repositories/external-sync-state-repository.port';
import { ProjectExternalLinkRepositoryPort } from '@src/modules/project-registry/domain/repositories/project-external-link-repository.port';
import { ProjectRepositoryPort } from '@src/modules/project-registry/domain/repositories/project-repository.port';

import { JiraProjectMappingConfig, JiraProjectAdapter } from './jira-project-adapter';
import { ExternalProjectArchived } from '../domain/events/external-project-archived.event';
import { ExternalProjectDiscovered } from '../domain/events/external-project-discovered.event';
import { ExternalProjectUpdated } from '../domain/events/external-project-updated.event';

interface JiraProjectSyncResult {
  projectsCreated: number;
  projectsUpdated: number;
  syncedProjectIds: ProjectId[];
}

type ExternalMappingIndex = Record<string, string>;

export class JiraProjectSyncService {
  private readonly createProjectService: CreateProjectService;
  private readonly linkExternalProjectService: LinkExternalProjectService;
  private readonly updateExternalSyncStateService: UpdateExternalSyncStateService;
  private readonly mappingConfig: JiraProjectMappingConfig;

  public constructor(
    private readonly jiraProjectAdapter: JiraProjectAdapter,
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly projectExternalLinkRepository: ProjectExternalLinkRepositoryPort,
    externalSyncStateRepository: ExternalSyncStateRepositoryPort,
    mappingConfig?: Partial<JiraProjectMappingConfig>,
    private readonly preferredProjectMapping: ExternalMappingIndex = {},
    private readonly conflictingProjectMapping: ExternalMappingIndex = {},
  ) {
    this.createProjectService = new CreateProjectService(projectRepository);
    this.linkExternalProjectService = new LinkExternalProjectService(
      projectRepository,
      projectExternalLinkRepository,
    );
    this.updateExternalSyncStateService = new UpdateExternalSyncStateService(
      externalSyncStateRepository,
    );
    this.mappingConfig = {
      projectCodePrefix: mappingConfig?.projectCodePrefix ?? 'JIRA',
    };
  }

  public async syncProjects(): Promise<JiraProjectSyncResult> {
    const projects = await this.jiraProjectAdapter.fetchProjects();
    const events: Array<
      ExternalProjectArchived | ExternalProjectDiscovered | ExternalProjectUpdated
    > = [];
    const seenExternalKeys = new Set<string>();
    const syncedProjectIds: ProjectId[] = [];
    let projectsCreated = 0;
    let projectsUpdated = 0;

    for (const project of projects) {
      const mapped = await this.jiraProjectAdapter.mapExternalProjectToInternal(
        project,
        this.mappingConfig,
      );
      const existingLink = await this.projectExternalLinkRepository.findByExternalKey(
        ExternalSystemType.jira(),
        ExternalProjectKey.from(mapped.externalProjectKey),
      );
      const mappingKey = `${ExternalSystemType.jira().value}:${mapped.externalProjectKey}`;

      if (seenExternalKeys.has(mappingKey)) {
        throw new Error('Duplicate external Jira project key returned by adapter.');
      }

      seenExternalKeys.add(mappingKey);

      if (
        this.preferredProjectMapping[mappingKey] &&
        this.conflictingProjectMapping[mappingKey] &&
        this.preferredProjectMapping[mappingKey] !== this.conflictingProjectMapping[mappingKey]
      ) {
        throw new Error('Duplicate external Jira key mapped to multiple internal projects.');
      }

      const linkedProjectId =
        existingLink?.projectId.value ??
        this.preferredProjectMapping[mappingKey] ??
        this.conflictingProjectMapping[mappingKey];
      let projectId: ProjectId;
      let created = false;

      if (linkedProjectId) {
        projectId = ProjectId.from(linkedProjectId);
        const existingProject = await this.projectRepository.findByProjectId(projectId);

        if (!existingProject) {
          throw new Error('Mapped internal project does not exist.');
        }

        existingProject.enrich({
          description: mapped.description,
          name: mapped.externalProjectName,
        });
        await this.projectRepository.save(existingProject);
      } else {
        const createdProject = await this.createProjectService.execute({
          description: mapped.description,
          name: mapped.externalProjectName,
          projectCode: mapped.internalProjectCode,
        });
        projectId = createdProject.projectId;
        created = true;

        createdProject.enrich({
          status: 'ACTIVE',
        });
        await this.projectRepository.save(createdProject);
      }

      const link = await this.linkExternalProjectService.execute({
        externalProjectKey: ExternalProjectKey.from(mapped.externalProjectKey),
        externalProjectName: mapped.externalProjectName,
        externalUrl: mapped.externalUrl,
        projectId,
        systemType: ExternalSystemType.jira(),
      });

      if (mapped.archived) {
        link.archive(new Date());
        await this.projectExternalLinkRepository.save(link);
        events.push(
          new ExternalProjectArchived(projectId, 'JIRA', mapped.externalProjectKey),
        );
      } else if (created) {
        events.push(
          new ExternalProjectDiscovered(
            projectId,
            'JIRA',
            mapped.externalProjectKey,
            mapped.externalUrl,
          ),
        );
      } else {
        events.push(
          new ExternalProjectUpdated(
            projectId,
            'JIRA',
            mapped.externalProjectKey,
            mapped.externalUrl,
          ),
        );
      }

      await this.updateExternalSyncStateService.execute({
        lastSyncedAt: new Date(),
        projectExternalLinkId: link.id,
        lastSuccessfulSyncedAt: new Date(),
        syncStatus: mapped.archived ? 'PARTIAL' : 'SUCCEEDED',
      });

      projectsCreated += created ? 1 : 0;
      projectsUpdated += created ? 0 : 1;
      syncedProjectIds.push(projectId);
    }

    await this.jiraProjectAdapter.publishProjectSyncEvents(events);

    return {
      projectsCreated,
      projectsUpdated,
      syncedProjectIds,
    };
  }
}
