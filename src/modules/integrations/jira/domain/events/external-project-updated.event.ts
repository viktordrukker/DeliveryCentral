import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';

export class ExternalProjectUpdated {
  public readonly occurredAt = new Date();
  public readonly type = 'ExternalProjectUpdated';

  public constructor(
    public readonly projectId: ProjectId,
    public readonly provider: 'JIRA',
    public readonly externalProjectKey: string,
    public readonly externalUrl?: string,
  ) {}
}
