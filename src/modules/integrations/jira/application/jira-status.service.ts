import { JiraIntegrationStatusDto } from '../contracts/jira-integration-status.contract';
import { JiraWorkEvidenceAdapter } from './jira-work-evidence-adapter';
import { JiraSyncStatusStore } from './jira-sync-status.store';

export class JiraStatusService {
  public constructor(
    private readonly jiraSyncStatusStore: JiraSyncStatusStore,
    private readonly jiraWorkEvidenceAdapter?: JiraWorkEvidenceAdapter,
  ) {}

  public getStatus(): JiraIntegrationStatusDto {
    const snapshot = this.jiraSyncStatusStore.getSnapshot();

    return {
      lastProjectSyncAt: snapshot.lastProjectSyncAt?.toISOString(),
      lastProjectSyncOutcome: snapshot.lastProjectSyncOutcome,
      lastProjectSyncSummary: snapshot.lastProjectSyncSummary,
      provider: 'jira',
      status: 'configured',
      supportsProjectSync: true,
      supportsWorkEvidence: this.jiraWorkEvidenceAdapter?.getProviderName() === 'jira',
    };
  }
}
