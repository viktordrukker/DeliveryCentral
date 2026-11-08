import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import { JSM_CONNECTOR, type JsmConnector } from '@src/shared/jsm/jsm-connector';
import { LdapDirectoryAdapter } from '@src/shared/ldap/ldap-directory-adapter';
import { LLM_CLIENT, type LlmClient } from '@src/shared/llm/llm-client';

import { JiraStatusService } from '../../integrations/jira/application/jira-status.service';
import { M365DirectoryStatusService } from '../../integrations/m365/application/m365-directory-status.service';
import { RadiusStatusService } from '../../integrations/radius/application/radius-status.service';

/**
 * F-8.1 / NEW C1-INT-FRAMEWORK — unified adapter registry.
 *
 * Aggregates every backend integration adapter into a single registry
 * view so admins can see at a glance which connectors are configured,
 * reachable, and when each last synced. The legacy
 * `/api/admin/config/integrations` endpoint covers Jira/M365/Radius;
 * this registry adds JSM (F-4.6), LDAP (F-4.7), and LLM (F-4.1) so
 * all six adapters surface in one place.
 *
 * Shape stays deliberately uniform — every entry has `provider`,
 * `status`, `configured`, `lastSyncAt`, `lastSyncOutcome`,
 * `lastSyncSummary`, and `supportsManualSync`. Provider-specific
 * detail lives behind the legacy per-provider endpoints; this
 * registry is the at-a-glance index.
 */

export type IntegrationProvider =
  | 'jira'
  | 'm365'
  | 'radius'
  | 'jsm'
  | 'ldap'
  | 'llm';

export type IntegrationStatus = 'configured' | 'degraded' | 'not_configured';

export interface IntegrationRegistryEntry {
  provider: IntegrationProvider;
  /** Display label, e.g. `Jira PPM`, `JSM Cloud`, `M365 Directory`. */
  displayName: string;
  /** Short description for the registry card. */
  description: string;
  status: IntegrationStatus;
  configured: boolean;
  reachable: boolean | null;
  latencyMs: number | null;
  lastSyncAt: string | null;
  lastSyncOutcome: 'succeeded' | 'failed' | null;
  lastSyncSummary: string | null;
  supportsManualSync: boolean;
  /** Optional descriptor of the auth profile (e.g. 'cloud' / 'datacenter'). */
  deployment: string | null;
}

export interface IntegrationTestConnectionResult {
  provider: IntegrationProvider;
  reachable: boolean;
  latencyMs: number | null;
  errorMessage?: string;
}

@Injectable()
export class IntegrationsRegistryService {
  private readonly logger = new Logger(IntegrationsRegistryService.name);

  public constructor(
    private readonly jiraStatusService: JiraStatusService,
    private readonly m365DirectoryStatusService: M365DirectoryStatusService,
    private readonly radiusStatusService: RadiusStatusService,
    @Optional() @Inject(JSM_CONNECTOR) private readonly jsmClient?: JsmConnector,
    @Optional() private readonly ldapClient?: LdapDirectoryAdapter,
    @Optional() @Inject(LLM_CLIENT) private readonly llmClient?: LlmClient,
  ) {}

  public async list(): Promise<IntegrationRegistryEntry[]> {
    const [jira, m365, radius, jsm, ldap, llm] = await Promise.all([
      this.jiraEntry().catch((error) => this.errorEntry('jira', 'Jira PPM', error)),
      this.m365Entry().catch((error) => this.errorEntry('m365', 'Microsoft 365 Directory', error)),
      this.radiusEntry().catch((error) => this.errorEntry('radius', 'Radius', error)),
      this.jsmEntry().catch((error) => this.errorEntry('jsm', 'JSM Cloud', error)),
      this.ldapEntry().catch((error) => this.errorEntry('ldap', 'LDAP / Active Directory', error)),
      this.llmEntry().catch((error) => this.errorEntry('llm', 'Local LLM', error)),
    ]);
    return [jira, m365, radius, jsm, ldap, llm];
  }

  /**
   * W2-10 — registry-side reachability probe for JSM / LDAP / LLM.
   * Jira / M365 / RADIUS have their own per-controller probes; the
   * registry path covers the three adapters that only live in env
   * config (no per-provider controller).
   */
  public async testConnection(provider: IntegrationProvider): Promise<IntegrationTestConnectionResult> {
    if (provider === 'jsm') {
      if (!this.jsmClient) {
        return { provider, reachable: false, latencyMs: null, errorMessage: 'JSM adapter is not wired in this build.' };
      }
      const probe = await this.jsmClient.probe();
      return {
        provider,
        reachable: probe.reachable,
        latencyMs: probe.latencyMs,
        errorMessage: probe.error,
      };
    }
    if (provider === 'ldap') {
      if (!this.ldapClient) {
        return { provider, reachable: false, latencyMs: null, errorMessage: 'LDAP adapter is not wired in this build.' };
      }
      const probe = await this.ldapClient.probe();
      return {
        provider,
        reachable: probe.reachable,
        latencyMs: probe.latencyMs,
        errorMessage: probe.error,
      };
    }
    if (provider === 'llm') {
      if (!this.llmClient) {
        return { provider, reachable: false, latencyMs: null, errorMessage: 'LLM adapter is not wired in this build.' };
      }
      const probe = await this.llmClient.probe();
      return {
        provider,
        reachable: probe.reachable,
        latencyMs: probe.latencyMs,
        errorMessage: probe.error,
      };
    }
    return {
      provider,
      reachable: false,
      latencyMs: null,
      errorMessage: `Provider ${provider} cannot be probed from the registry. Use the legacy controllers for jira/m365/radius.`,
    };
  }

  private async jiraEntry(): Promise<IntegrationRegistryEntry> {
    const s = await this.jiraStatusService.getStatus();
    return {
      provider: 'jira',
      displayName: 'Jira PPM',
      description: 'Project + work-evidence sync from Atlassian Jira (PPM source).',
      status: s.status,
      configured: s.status !== 'not_configured',
      reachable: s.status === 'configured' ? true : s.status === 'degraded' ? false : null,
      latencyMs: null,
      lastSyncAt: s.lastProjectSyncAt ?? null,
      lastSyncOutcome: s.lastProjectSyncOutcome ?? null,
      lastSyncSummary: s.lastProjectSyncSummary ?? null,
      supportsManualSync: s.supportsProjectSync,
      deployment: null,
    };
  }

  private async m365Entry(): Promise<IntegrationRegistryEntry> {
    const s = await this.m365DirectoryStatusService.getStatus();
    return {
      provider: 'm365',
      displayName: 'Microsoft 365 Directory',
      description: 'User / manager directory sync from Microsoft 365 / Entra ID.',
      status: s.status,
      configured: s.status !== 'not_configured',
      reachable: s.status === 'configured' ? true : s.status === 'degraded' ? false : null,
      latencyMs: null,
      lastSyncAt: s.lastDirectorySyncAt ?? null,
      lastSyncOutcome: s.lastDirectorySyncOutcome ?? null,
      lastSyncSummary: s.lastDirectorySyncSummary ?? null,
      supportsManualSync: s.supportsDirectorySync,
      deployment: null,
    };
  }

  private async radiusEntry(): Promise<IntegrationRegistryEntry> {
    const s = await this.radiusStatusService.getStatus();
    return {
      provider: 'radius',
      displayName: 'Radius',
      description: 'Account / identity reconciliation from Radius.',
      status: s.status,
      configured: s.status !== 'not_configured',
      reachable: s.status === 'configured' ? true : s.status === 'degraded' ? false : null,
      latencyMs: null,
      lastSyncAt: s.lastAccountSyncAt ?? null,
      lastSyncOutcome: s.lastAccountSyncOutcome ?? null,
      lastSyncSummary: s.lastAccountSyncSummary ?? null,
      supportsManualSync: s.supportsAccountSync,
      deployment: null,
    };
  }

  private async jsmEntry(): Promise<IntegrationRegistryEntry> {
    if (!this.jsmClient) {
      return this.unwiredEntry('jsm', 'JSM Cloud', 'Two-way Jira Service Management case sync (F-4.6).');
    }
    const probe = await this.jsmClient.probe();
    return {
      provider: 'jsm',
      displayName: 'JSM Cloud',
      description: 'Two-way Jira Service Management case sync (F-4.6).',
      status: this.classifyProbe(probe.configured, probe.reachable),
      configured: probe.configured,
      reachable: probe.reachable,
      latencyMs: probe.latencyMs,
      lastSyncAt: null,
      lastSyncOutcome: null,
      lastSyncSummary: probe.error ?? null,
      supportsManualSync: false,
      deployment: probe.deployment ?? null,
    };
  }

  private async ldapEntry(): Promise<IntegrationRegistryEntry> {
    if (!this.ldapClient) {
      return this.unwiredEntry('ldap', 'LDAP / Active Directory', 'Bank-AD / on-prem directory sync (F-4.7).');
    }
    const probe = await this.ldapClient.probe();
    return {
      provider: 'ldap',
      displayName: 'LDAP / Active Directory',
      description: 'Bank-AD / on-prem directory sync (F-4.7).',
      status: this.classifyProbe(probe.configured, probe.reachable),
      configured: probe.configured,
      reachable: probe.reachable,
      latencyMs: probe.latencyMs,
      lastSyncAt: null,
      lastSyncOutcome: null,
      lastSyncSummary: probe.error ?? null,
      supportsManualSync: false,
      deployment: null,
    };
  }

  private async llmEntry(): Promise<IntegrationRegistryEntry> {
    if (!this.llmClient) {
      return this.unwiredEntry('llm', 'Local LLM', 'OpenAI-compatible local-LLM scaffold (F-4.1).');
    }
    const probe = await this.llmClient.probe();
    return {
      provider: 'llm',
      displayName: 'Local LLM',
      description: 'OpenAI-compatible local-LLM scaffold (F-4.1).',
      status: this.classifyProbe(probe.configured, probe.reachable),
      configured: probe.configured,
      reachable: probe.reachable,
      latencyMs: probe.latencyMs,
      lastSyncAt: null,
      lastSyncOutcome: null,
      lastSyncSummary: probe.error ?? null,
      supportsManualSync: false,
      deployment: null,
    };
  }

  private classifyProbe(configured: boolean, reachable: boolean): IntegrationStatus {
    if (!configured) return 'not_configured';
    return reachable ? 'configured' : 'degraded';
  }

  private unwiredEntry(
    provider: IntegrationProvider,
    displayName: string,
    description: string,
  ): IntegrationRegistryEntry {
    return {
      provider,
      displayName,
      description,
      status: 'not_configured',
      configured: false,
      reachable: null,
      latencyMs: null,
      lastSyncAt: null,
      lastSyncOutcome: null,
      lastSyncSummary: null,
      supportsManualSync: false,
      deployment: null,
    };
  }

  private errorEntry(
    provider: IntegrationProvider,
    displayName: string,
    error: unknown,
  ): IntegrationRegistryEntry {
    this.logger.warn(
      `${provider} registry probe failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      provider,
      displayName,
      description: '',
      status: 'degraded',
      configured: false,
      reachable: false,
      latencyMs: null,
      lastSyncAt: null,
      lastSyncOutcome: 'failed',
      lastSyncSummary: error instanceof Error ? error.message : String(error),
      supportsManualSync: false,
      deployment: null,
    };
  }
}
