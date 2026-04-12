import { JiraProjectAdapter, JiraProjectMappingConfig, MappedExternalProject } from '../../application/jira-project-adapter';
import { JiraProjectRecord } from '../../contracts/jira-project-record.contract';
import { ExternalProjectArchived } from '../../domain/events/external-project-archived.event';
import { ExternalProjectDiscovered } from '../../domain/events/external-project-discovered.event';
import { ExternalProjectUpdated } from '../../domain/events/external-project-updated.event';

export class InMemoryJiraProjectAdapter implements JiraProjectAdapter {
  private readonly publishedEvents: Array<
    ExternalProjectArchived | ExternalProjectDiscovered | ExternalProjectUpdated
  > = [];
  private cursor = 0;

  public constructor(
    private readonly projects: JiraProjectRecord[] = [],
    private readonly options: { progressiveFetch?: boolean } = {},
  ) {}

  public async fetchProjectByKey(key: string): Promise<JiraProjectRecord | null> {
    return this.projects.find((project) => project.key === key) ?? null;
  }

  public async fetchProjects(): Promise<JiraProjectRecord[]> {
    if (this.projects.length === 0) {
      return [];
    }

    if (this.options.progressiveFetch) {
      const item = this.projects[Math.min(this.cursor, this.projects.length - 1)];
      this.cursor += 1;
      return item ? [item] : [];
    }

    return [...this.projects];
  }

  public async mapExternalProjectToInternal(
    project: JiraProjectRecord,
    config: JiraProjectMappingConfig,
  ): Promise<MappedExternalProject> {
    return {
      archived: project.archived,
      description: project.description,
      externalProjectKey: project.key,
      externalProjectName: project.name,
      externalUrl: project.webUrl ?? project.selfUrl,
      internalProjectCode: `${config.projectCodePrefix}-${project.key}`,
    };
  }

  public async publishProjectSyncEvents(
    events: Array<ExternalProjectArchived | ExternalProjectDiscovered | ExternalProjectUpdated>,
  ): Promise<void> {
    this.publishedEvents.push(...events);
  }

  public getPublishedEvents(): Array<
    ExternalProjectArchived | ExternalProjectDiscovered | ExternalProjectUpdated
  > {
    return [...this.publishedEvents];
  }
}
