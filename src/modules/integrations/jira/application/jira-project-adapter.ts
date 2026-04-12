import { JiraProjectRecord } from '../contracts/jira-project-record.contract';
import { ExternalProjectArchived } from '../domain/events/external-project-archived.event';
import { ExternalProjectDiscovered } from '../domain/events/external-project-discovered.event';
import { ExternalProjectUpdated } from '../domain/events/external-project-updated.event';

export interface MappedExternalProject {
  archived: boolean;
  description?: string;
  externalProjectKey: string;
  externalProjectName: string;
  externalUrl?: string;
  internalProjectCode: string;
}

export interface JiraProjectMappingConfig {
  projectCodePrefix: string;
}

export interface JiraProjectAdapter {
  fetchProjectByKey(key: string): Promise<JiraProjectRecord | null>;
  fetchProjects(): Promise<JiraProjectRecord[]>;
  mapExternalProjectToInternal(
    project: JiraProjectRecord,
    config: JiraProjectMappingConfig,
  ): Promise<MappedExternalProject>;
  publishProjectSyncEvents(
    events: Array<ExternalProjectArchived | ExternalProjectDiscovered | ExternalProjectUpdated>,
  ): Promise<void>;
}
