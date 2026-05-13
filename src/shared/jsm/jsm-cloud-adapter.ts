import { Injectable, Logger } from '@nestjs/common';

import { JsmConnector, JsmCreateIssueInput, JsmCreateIssueResult, JsmProbeResult } from './jsm-connector';

const DEFAULT_TIMEOUT_MS = 15_000;
const PROBE_TIMEOUT_MS = 1_500;

/**
 * F-4.6 / C1-JSM — Atlassian Cloud-hosted JSM client.
 *
 * Authenticates with the standard `email:apiToken` HTTP Basic header.
 * Targets the Cloud REST API v3 (`/rest/api/3/issue` for creation,
 * `/rest/api/3/myself` for the reachability probe).
 *
 * Configuration (env-driven for now; will move to PlatformSettings in
 * a follow-up alongside the outbox-event subscription):
 *
 *   JSM_BASE_URL       e.g. https://your-bank.atlassian.net
 *   JSM_API_EMAIL      Atlassian account email
 *   JSM_API_TOKEN      Atlassian API token
 *   JSM_PROJECT_KEY    Default project (e.g. IT) when no per-issue override
 *
 * A separate `JsmDataCenterAdapter` will follow for on-prem JSM with
 * Personal Access Token auth. Both will implement the same
 * `JsmConnector` interface, switched at module construction by
 * `integrations.jsm.deployment`.
 */
@Injectable()
export class JsmCloudAdapter implements JsmConnector {
  private readonly logger = new Logger(JsmCloudAdapter.name);
  private readonly baseUrl = process.env.JSM_BASE_URL?.replace(/\/$/, '') ?? null;
  private readonly email = process.env.JSM_API_EMAIL ?? null;
  private readonly apiToken = process.env.JSM_API_TOKEN ?? null;
  private readonly defaultProjectKey = process.env.JSM_PROJECT_KEY ?? null;

  public isConfigured(): boolean {
    return this.baseUrl !== null && this.email !== null && this.apiToken !== null;
  }

  public async createIssue(input: JsmCreateIssueInput): Promise<JsmCreateIssueResult> {
    if (!this.baseUrl || !this.email || !this.apiToken) {
      throw new Error('JSM is not configured; cannot create issue.');
    }
    const projectKey = input.projectKey ?? this.defaultProjectKey;
    if (!projectKey) {
      throw new Error('No JSM project key set (input.projectKey or JSM_PROJECT_KEY env).');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          fields: {
            project: { key: projectKey },
            issuetype: { name: 'Task' },
            summary: input.summary.slice(0, 250),
            description: this.toAdf(input.description),
            // Cloud convention: custom `external_reference` field if configured;
            // here we stash it in the labels so any project picks it up.
            labels: [`dc-case:${input.externalReference}`],
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '<no body>');
        throw new Error(`JSM create-issue failed: HTTP ${response.status} — ${body.slice(0, 200)}`);
      }
      const data = (await response.json()) as { id?: string; key?: string };
      if (!data.id || !data.key) {
        throw new Error('JSM create-issue response missing id/key.');
      }
      return {
        issueId: data.id,
        issueKey: data.key,
        issueUrl: `${this.baseUrl}/browse/${data.key}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  public async probe(): Promise<JsmProbeResult> {
    if (!this.isConfigured()) {
      return { configured: false, reachable: false, latencyMs: null, deployment: null };
    }
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl!}/rest/api/3/myself`, {
        method: 'GET',
        headers: this.headers(),
        signal: controller.signal,
      });
      return {
        configured: true,
        reachable: true,
        latencyMs: Date.now() - startedAt,
        deployment: 'cloud',
        ...(response.ok ? {} : { error: `Probe responded with HTTP ${response.status}` }),
      };
    } catch (error) {
      return {
        configured: true,
        reachable: false,
        latencyMs: null,
        deployment: 'cloud',
        error: error instanceof Error ? error.message : 'Unknown probe error.',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private headers(): Record<string, string> {
    const credentials = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Cloud's `description` field expects Atlassian Document Format. The
   * minimum valid ADF for plain text is a doc with one paragraph node
   * containing a single text node.
   */
  private toAdf(text: string): unknown {
    return {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text }],
        },
      ],
    };
  }
}
