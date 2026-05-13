/**
 * F-4.6 / C1-JSM — JSM (Jira Service Management) connector contract.
 *
 * Two deployment shapes:
 *   - Cloud  (Atlassian-hosted, OAuth or API token + email)
 *   - Data Center (self-hosted, Personal Access Token)
 *
 * One interface, two implementations selected at runtime via
 * `integrations.jsm.deployment` PlatformSetting. The DC vs Cloud
 * differences live entirely behind the adapter boundary — case
 * creation, webhook normalisation, and probe all share the same
 * surface.
 *
 * Scope of this PR: the contract + the Cloud-shaped HTTP client +
 * a health probe. Outbox-event subscription (auto-fire on
 * `case.created` for EMPLOYEE_ISSUE) lands in a follow-up so a single
 * PR keeps the diff manageable.
 */

export interface JsmCreateIssueInput {
  /** DC case id used to back-reference the JSM ticket. Stored on the
   *  JSM issue's `external_reference` custom field when configured. */
  externalReference: string;
  /** Issue summary (≤200 chars by JSM convention). */
  summary: string;
  /** Long description / body. JSM accepts ADF JSON but plain text is
   *  fine for the auto-routed case-management path. */
  description: string;
  /** JSM project key (e.g. `IT`, `HR`). Optional — adapter may fall
   *  back to the configured default project. */
  projectKey?: string;
  /** JSM request type id (Cloud-only). Optional. */
  requestTypeId?: string;
}

export interface JsmCreateIssueResult {
  /** JSM-side issue id (numeric or short string). */
  issueId: string;
  /** JSM-side issue key (e.g. `IT-1234`). */
  issueKey: string;
  /** Full URL into the bank's JSM portal so PMs can deep-link. */
  issueUrl: string;
}

export interface JsmProbeResult {
  /** True when `integrations.jsm.*` config is set (regardless of reachability). */
  configured: boolean;
  /** True when a `GET /rest/api/3/myself` (Cloud) or equivalent probe responds within timeout. */
  reachable: boolean;
  /** Probe round-trip in ms; null when unconfigured or probe failed. */
  latencyMs: number | null;
  /** Deployment shape detected (or configured). */
  deployment: 'cloud' | 'datacenter' | null;
  error?: string;
}

export interface JsmConnector {
  createIssue(input: JsmCreateIssueInput): Promise<JsmCreateIssueResult>;
  probe(): Promise<JsmProbeResult>;
}

export const JSM_CONNECTOR = Symbol('JsmConnector');
