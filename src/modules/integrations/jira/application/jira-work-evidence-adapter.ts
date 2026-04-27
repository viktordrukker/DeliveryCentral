/**
 * Adapter contract for Jira work-evidence integration.
 *
 * Today only `getProviderName` is required — the production import flow is not
 * built and the wiring uses {@link InMemoryJiraWorkEvidenceAdapter} as a stub
 * so {@link JiraStatusService} can report a stable provider key. When the real
 * import flow lands (planned but unscheduled — see backlog), extend this
 * interface with the normalized fetch methods rather than introducing a parallel
 * abstraction.
 */
export interface JiraWorkEvidenceAdapter {
  getProviderName(): 'jira';
}
