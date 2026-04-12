import {
  JiraProjectAdapter,
  JiraProjectMappingConfig,
  MappedExternalProject,
} from '@src/modules/integrations/jira/application/jira-project-adapter';
import { JiraProjectRecord } from '@src/modules/integrations/jira/contracts/jira-project-record.contract';
import { ExternalProjectArchived } from '@src/modules/integrations/jira/domain/events/external-project-archived.event';
import { ExternalProjectDiscovered } from '@src/modules/integrations/jira/domain/events/external-project-discovered.event';
import { ExternalProjectUpdated } from '@src/modules/integrations/jira/domain/events/external-project-updated.event';

type SyncStep =
  | { mode: 'success'; projects: JiraProjectRecord[] }
  | { errorMessage: string; mode: 'failure' };

export class FakeJiraSyncScenarioAdapter implements JiraProjectAdapter {
  private callIndex = 0;
  private readonly publishedEvents: Array<
    ExternalProjectArchived | ExternalProjectDiscovered | ExternalProjectUpdated
  > = [];

  public constructor(private readonly steps: SyncStep[]) {}

  public async fetchProjectByKey(key: string): Promise<JiraProjectRecord | null> {
    for (const step of this.steps) {
      if (step.mode === 'success') {
        const match = step.projects.find((project) => project.key === key);
        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  public async fetchProjects(): Promise<JiraProjectRecord[]> {
    const step = this.steps[Math.min(this.callIndex, this.steps.length - 1)];
    this.callIndex += 1;

    if (!step) {
      return [];
    }

    if (step.mode === 'failure') {
      throw new Error(step.errorMessage);
    }

    return [...step.projects];
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
