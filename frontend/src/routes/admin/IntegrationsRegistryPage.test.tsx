import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchIntegrationsRegistry,
  testIntegrationRegistryConnection,
} from '@/lib/api/integrations-registry';
import { IntegrationsRegistryPage } from './IntegrationsRegistryPage';

vi.mock('@/lib/api/integrations-registry', () => ({
  fetchIntegrationsRegistry: vi.fn(),
  testIntegrationRegistryConnection: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchIntegrationsRegistry);
const mockedTest = vi.mocked(testIntegrationRegistryConnection);

describe('IntegrationsRegistryPage — W2-10 parity Test connection buttons (JSM / LDAP / LLM)', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedTest.mockReset();
    mockedFetch.mockResolvedValue([
      {
        provider: 'jira',
        displayName: 'Jira PPM',
        description: 'Project sync',
        status: 'configured',
        configured: true,
        reachable: true,
        latencyMs: 10,
        lastSyncAt: '2026-05-15T08:00:00.000Z',
        lastSyncOutcome: 'succeeded',
        lastSyncSummary: 'OK',
        supportsManualSync: true,
        deployment: null,
      },
      {
        provider: 'm365',
        displayName: 'Microsoft 365 Directory',
        description: 'Directory sync',
        status: 'configured',
        configured: true,
        reachable: true,
        latencyMs: 12,
        lastSyncAt: null,
        lastSyncOutcome: null,
        lastSyncSummary: null,
        supportsManualSync: true,
        deployment: null,
      },
      {
        provider: 'radius',
        displayName: 'Radius',
        description: 'Account sync',
        status: 'configured',
        configured: true,
        reachable: true,
        latencyMs: 15,
        lastSyncAt: null,
        lastSyncOutcome: null,
        lastSyncSummary: null,
        supportsManualSync: true,
        deployment: null,
      },
      {
        provider: 'jsm',
        displayName: 'JSM Cloud',
        description: 'Case sync',
        status: 'not_configured',
        configured: false,
        reachable: null,
        latencyMs: null,
        lastSyncAt: null,
        lastSyncOutcome: null,
        lastSyncSummary: null,
        supportsManualSync: false,
        deployment: null,
      },
      {
        provider: 'ldap',
        displayName: 'LDAP / Active Directory',
        description: 'Bank-AD directory',
        status: 'not_configured',
        configured: false,
        reachable: null,
        latencyMs: null,
        lastSyncAt: null,
        lastSyncOutcome: null,
        lastSyncSummary: null,
        supportsManualSync: false,
        deployment: null,
      },
      {
        provider: 'llm',
        displayName: 'Local LLM',
        description: 'OpenAI scaffold',
        status: 'not_configured',
        configured: false,
        reachable: null,
        latencyMs: null,
        lastSyncAt: null,
        lastSyncOutcome: null,
        lastSyncSummary: null,
        supportsManualSync: false,
        deployment: null,
      },
    ]);
  });

  it('renders Test connection buttons for JSM, LDAP, LLM and Open buttons for legacy providers', async () => {
    render(
      <MemoryRouter>
        <IntegrationsRegistryPage />
      </MemoryRouter>,
    );

    await screen.findByText('Integrations Registry');

    expect(await screen.findByTestId('registry-open-jira')).toBeInTheDocument();
    expect(screen.getByTestId('registry-open-m365')).toBeInTheDocument();
    expect(screen.getByTestId('registry-open-radius')).toBeInTheDocument();
    expect(screen.getByTestId('registry-test-jsm')).toBeInTheDocument();
    expect(screen.getByTestId('registry-test-ldap')).toBeInTheDocument();
    expect(screen.getByTestId('registry-test-llm')).toBeInTheDocument();
  });

  it('calls testIntegrationRegistryConnection for JSM when Test connection is clicked', async () => {
    mockedTest.mockResolvedValue({ provider: 'jsm', reachable: true, latencyMs: 42 });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <IntegrationsRegistryPage />
      </MemoryRouter>,
    );

    await screen.findByText('Integrations Registry');
    await user.click(await screen.findByTestId('registry-test-jsm'));

    await waitFor(() => {
      expect(mockedTest).toHaveBeenCalledWith('jsm');
    });
  });

  it('calls testIntegrationRegistryConnection for LDAP when Test connection is clicked', async () => {
    mockedTest.mockResolvedValue({ provider: 'ldap', reachable: false, latencyMs: null, errorMessage: 'LDAP unreachable' });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <IntegrationsRegistryPage />
      </MemoryRouter>,
    );

    await screen.findByText('Integrations Registry');
    await user.click(await screen.findByTestId('registry-test-ldap'));

    await waitFor(() => {
      expect(mockedTest).toHaveBeenCalledWith('ldap');
    });
  });
});
