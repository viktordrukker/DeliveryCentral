import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';

export class ExternalProjectArchived {
  public readonly occurredAt = new Date();
  public readonly type = 'ExternalProjectArchived';

  public constructor(
    public readonly projectId: ProjectId,
    public readonly provider: 'JIRA',
    public readonly externalProjectKey: string,
  ) {}
}
