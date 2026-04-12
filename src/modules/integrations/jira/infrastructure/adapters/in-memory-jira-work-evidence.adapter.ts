import { JiraWorkEvidenceAdapter } from '../../application/jira-work-evidence-adapter';

export class InMemoryJiraWorkEvidenceAdapter implements JiraWorkEvidenceAdapter {
  public getProviderName(): 'jira' {
    return 'jira';
  }
}
