import { IntegrationsRegistryService } from '@src/modules/admin/application/integrations-registry.service';
import type { JsmConnector } from '@src/shared/jsm/jsm-connector';
import type { LdapDirectoryAdapter } from '@src/shared/ldap/ldap-directory-adapter';
import type { LlmClient } from '@src/shared/llm/llm-client';
import type { JiraStatusService } from '@src/modules/integrations/jira/application/jira-status.service';
import type { M365DirectoryStatusService } from '@src/modules/integrations/m365/application/m365-directory-status.service';
import type { RadiusStatusService } from '@src/modules/integrations/radius/application/radius-status.service';

function stubJira(status: 'configured' | 'degraded' | 'not_configured'): JiraStatusService {
  return {
    getStatus: async () => ({
      provider: 'jira' as const,
      status,
      lastProjectSyncAt: '2026-05-15T08:00:00Z',
      lastProjectSyncOutcome: 'succeeded' as const,
      lastProjectSyncSummary: '12 projects synced',
      supportsProjectSync: true,
      supportsWorkEvidence: true,
    }),
  } as unknown as JiraStatusService;
}

function stubM365(status: 'configured' | 'degraded' | 'not_configured'): M365DirectoryStatusService {
  return {
    getStatus: async () => ({
      provider: 'm365' as const,
      status,
      lastDirectorySyncAt: null,
      lastDirectorySyncOutcome: null,
      lastDirectorySyncSummary: null,
      supportsDirectorySync: true,
      supportsManagerSync: true,
      defaultOrgUnitId: null,
      linkedIdentityCount: 0,
      matchStrategy: 'email_then_displayName' as const,
    }),
  } as unknown as M365DirectoryStatusService;
}

function stubRadius(status: 'configured' | 'degraded' | 'not_configured'): RadiusStatusService {
  return {
    getStatus: async () => ({
      provider: 'radius' as const,
      status,
      lastAccountSyncAt: null,
      lastAccountSyncOutcome: null,
      lastAccountSyncSummary: null,
      supportsAccountSync: true,
      linkedAccountCount: 0,
      unlinkedAccountCount: 0,
      matchStrategy: 'email_then_displayName' as const,
    }),
  } as unknown as RadiusStatusService;
}

function stubJsm(opts: { configured: boolean; reachable: boolean }): JsmConnector {
  return {
    probe: async () => ({
      configured: opts.configured,
      reachable: opts.reachable,
      latencyMs: opts.reachable ? 42 : null,
      deployment: 'cloud',
    }),
  } as unknown as JsmConnector;
}

function stubLdap(opts: { configured: boolean; reachable: boolean }): LdapDirectoryAdapter {
  return {
    probe: async () => ({
      configured: opts.configured,
      reachable: opts.reachable,
      latencyMs: opts.reachable ? 25 : null,
    }),
  } as unknown as LdapDirectoryAdapter;
}

function stubLlm(opts: { configured: boolean; reachable: boolean }): LlmClient {
  return {
    probe: async () => ({
      configured: opts.configured,
      reachable: opts.reachable,
      latencyMs: opts.reachable ? 88 : null,
    }),
  } as unknown as LlmClient;
}

describe('IntegrationsRegistryService (F-8.1 / NEW C1-INT-FRAMEWORK)', () => {
  it('returns one entry per adapter in fixed order', async () => {
    const svc = new IntegrationsRegistryService(
      stubJira('configured'),
      stubM365('not_configured'),
      stubRadius('not_configured'),
      stubJsm({ configured: false, reachable: false }),
      stubLdap({ configured: false, reachable: false }),
      stubLlm({ configured: false, reachable: false }),
    );
    const out = await svc.list();
    expect(out.map((e) => e.provider)).toEqual(['jira', 'm365', 'radius', 'jsm', 'ldap', 'llm']);
  });

  it('classifies an unconfigured JSM probe as not_configured', async () => {
    const svc = new IntegrationsRegistryService(
      stubJira('not_configured'),
      stubM365('not_configured'),
      stubRadius('not_configured'),
      stubJsm({ configured: false, reachable: false }),
      stubLdap({ configured: false, reachable: false }),
      stubLlm({ configured: false, reachable: false }),
    );
    const out = await svc.list();
    const jsm = out.find((e) => e.provider === 'jsm')!;
    expect(jsm.status).toBe('not_configured');
    expect(jsm.configured).toBe(false);
  });

  it('classifies configured-but-unreachable as degraded', async () => {
    const svc = new IntegrationsRegistryService(
      stubJira('not_configured'),
      stubM365('not_configured'),
      stubRadius('not_configured'),
      stubJsm({ configured: true, reachable: false }),
      stubLdap({ configured: false, reachable: false }),
      stubLlm({ configured: false, reachable: false }),
    );
    const out = await svc.list();
    expect(out.find((e) => e.provider === 'jsm')?.status).toBe('degraded');
  });

  it('classifies configured-and-reachable as configured', async () => {
    const svc = new IntegrationsRegistryService(
      stubJira('not_configured'),
      stubM365('not_configured'),
      stubRadius('not_configured'),
      stubJsm({ configured: true, reachable: true }),
      stubLdap({ configured: true, reachable: true }),
      stubLlm({ configured: true, reachable: true }),
    );
    const out = await svc.list();
    expect(out.find((e) => e.provider === 'jsm')?.status).toBe('configured');
    expect(out.find((e) => e.provider === 'ldap')?.status).toBe('configured');
    expect(out.find((e) => e.provider === 'llm')?.status).toBe('configured');
  });

  it('handles missing JSM / LDAP / LLM clients as unwired (not_configured)', async () => {
    const svc = new IntegrationsRegistryService(
      stubJira('not_configured'),
      stubM365('not_configured'),
      stubRadius('not_configured'),
      undefined,
      undefined,
      undefined,
    );
    const out = await svc.list();
    expect(out.find((e) => e.provider === 'jsm')?.status).toBe('not_configured');
    expect(out.find((e) => e.provider === 'ldap')?.status).toBe('not_configured');
    expect(out.find((e) => e.provider === 'llm')?.status).toBe('not_configured');
  });

  it('captures Jira last-sync metadata', async () => {
    const svc = new IntegrationsRegistryService(
      stubJira('configured'),
      stubM365('not_configured'),
      stubRadius('not_configured'),
      undefined,
      undefined,
      undefined,
    );
    const out = await svc.list();
    const jira = out.find((e) => e.provider === 'jira')!;
    expect(jira.lastSyncAt).toBe('2026-05-15T08:00:00Z');
    expect(jira.lastSyncOutcome).toBe('succeeded');
    expect(jira.lastSyncSummary).toBe('12 projects synced');
  });

  it('degrades a probe to an error entry when the call throws', async () => {
    const throwingJsm = {
      probe: async () => {
        throw new Error('jsm down');
      },
    } as unknown as JsmConnector;
    const svc = new IntegrationsRegistryService(
      stubJira('not_configured'),
      stubM365('not_configured'),
      stubRadius('not_configured'),
      throwingJsm,
      undefined,
      undefined,
    );
    const out = await svc.list();
    const jsm = out.find((e) => e.provider === 'jsm')!;
    expect(jsm.status).toBe('degraded');
    expect(jsm.lastSyncSummary).toContain('jsm down');
  });
});
