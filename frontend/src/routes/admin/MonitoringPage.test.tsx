import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchDiagnostics,
  fetchHealth,
  fetchReadiness,
} from '@/lib/api/monitoring';
import { MonitoringPage } from './MonitoringPage';

vi.mock('@/lib/api/monitoring', () => ({
  fetchDiagnostics: vi.fn(),
  fetchHealth: vi.fn(),
  fetchReadiness: vi.fn(),
}));

const mockedFetchHealth = vi.mocked(fetchHealth);
const mockedFetchReadiness = vi.mocked(fetchReadiness);
const mockedFetchDiagnostics = vi.mocked(fetchDiagnostics);

describe('MonitoringPage', () => {
  beforeEach(() => {
    mockedFetchHealth.mockReset();
    mockedFetchReadiness.mockReset();
    mockedFetchDiagnostics.mockReset();
  });

  it('renders healthy monitoring summaries from enhanced diagnostics', async () => {
    mockedFetchHealth.mockResolvedValue({
      diagnosticsPath: '/diagnostics',
      environment: 'development',
      service: 'workload-tracking-platform',
      status: 'ok',
      timestamp: '2026-03-31T10:00:00.000Z',
    });
    mockedFetchReadiness.mockResolvedValue({
      checks: [
        {
          name: 'database',
          status: 'ready',
          summary: 'Database connection available.',
        },
        {
          name: 'integrations',
          status: 'ready',
          summary: 'Integration status is ready.',
        },
      ],
      status: 'ready',
      timestamp: '2026-03-31T10:00:00.000Z',
    });
    mockedFetchDiagnostics.mockResolvedValue({
      auditVisibility: {
        lastBusinessAuditAt: '2026-03-31T09:58:00.000Z',
        totalBusinessAuditRecords: 17,
      },
      database: {
        connected: true,
        latencyMs: 14,
        host: 'postgres',
        port: 5432,
        schema: 'public',
        schemaHealthy: true,
        serverTime: '2026-03-31 10:00:00+00',
        version: 'PostgreSQL 16',
      },
      integrations: {
        configuredCount: 3,
        degradedCount: 0,
        items: [
          {
            capabilities: ['project_sync', 'work_evidence'],
            lastOutcome: 'succeeded',
            lastSyncAt: '2026-03-31T09:57:00.000Z',
            name: 'jira',
            status: 'configured',
            summary: 'Project sync completed.',
            summaryMetrics: [
              { label: 'Project Sync', value: 'supported' },
              { label: 'Work Evidence', value: 'supported' },
            ],
          },
        ],
        neverSyncedCount: 0,
        overallStatus: 'ready',
      },
      migrations: {
        appliedCount: 12,
        availableLocalCount: 12,
        latestAppliedAt: '2026-03-31T09:00:00.000Z',
        migrationTableAccessible: true,
        pendingLocalCount: 0,
        status: 'ready',
      },
      notifications: {
        enabledChannelCount: 2,
        failedDeliveryCount: 0,
        lastAttemptedAt: '2026-03-31T09:59:00.000Z',
        ready: true,
        recentOutcomeCount: 4,
        retryingDeliveryCount: 0,
        status: 'ready',
        succeededDeliveryCount: 4,
        summary:
          'Notification channels and templates are configured with no recent degraded outcomes.',
        terminalFailureCount: 0,
        templateCount: 6,
      },
      service: 'workload-tracking-platform',
      timestamp: '2026-03-31T10:00:00.000Z',
    });

    renderWithRouter();

    expect(await screen.findByText('Monitoring')).toBeInTheDocument();
    expect(screen.getAllByText('System Status').length).toBeGreaterThan(0);
    expect(screen.getByText('Integration Health Summary')).toBeInTheDocument();
    expect(screen.getByText('Database Health')).toBeInTheDocument();
    expect(screen.getByText('Notification Readiness')).toBeInTheDocument();
    expect(screen.getByText('Readiness Checks')).toBeInTheDocument();
    expect(screen.getByText('Project sync completed.')).toBeInTheDocument();
    expect(screen.getAllByText('17').length).toBeGreaterThan(0);
    expect(screen.getAllByText('14 ms').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        'Notification channels and templates are configured with no recent degraded outcomes.',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('renders degraded diagnostics clearly for operators', async () => {
    mockedFetchHealth.mockResolvedValue({
      diagnosticsPath: '/diagnostics',
      environment: 'development',
      service: 'workload-tracking-platform',
      status: 'ok',
      timestamp: '2026-03-31T10:00:00.000Z',
    });
    mockedFetchReadiness.mockResolvedValue({
      checks: [
        {
          name: 'database',
          status: 'degraded',
          summary: 'Migration sanity degraded. 2 local migration(s) appear unapplied.',
        },
        {
          name: 'notifications',
          status: 'degraded',
          summary: 'Notifications have 1 terminal failure(s) and 2 retrying delivery attempt(s) in current runtime visibility.',
        },
      ],
      status: 'degraded',
      timestamp: '2026-03-31T10:00:00.000Z',
    });
    mockedFetchDiagnostics.mockResolvedValue({
      auditVisibility: {
        lastBusinessAuditAt: '2026-03-31T09:58:00.000Z',
        totalBusinessAuditRecords: 21,
      },
      database: {
        connected: true,
        error: undefined,
        host: 'postgres',
        latencyMs: 31,
        port: 5432,
        schema: 'public',
        schemaError: 'relation \"_prisma_migrations\" does not exist',
        schemaHealthy: false,
        serverTime: '2026-03-31 10:00:00+00',
        version: 'PostgreSQL 16',
      },
      integrations: {
        configuredCount: 3,
        degradedCount: 2,
        items: [
          {
            capabilities: ['project_sync', 'work_evidence'],
            lastOutcome: 'failed',
            lastSyncAt: '2026-03-31T09:57:00.000Z',
            name: 'jira',
            status: 'degraded',
            summary: 'Timeout while reaching provider.',
            summaryMetrics: [
              { label: 'Project Sync', value: 'supported' },
              { label: 'Work Evidence', value: 'supported' },
            ],
          },
          {
            capabilities: ['account_sync'],
            lastOutcome: undefined,
            lastSyncAt: undefined,
            name: 'radius',
            status: 'degraded',
            summary: 'Radius match strategy disabled.',
            summaryMetrics: [
              { label: 'Linked Accounts', value: 0 },
              { label: 'Unmatched Accounts', value: 3 },
            ],
          },
        ],
        neverSyncedCount: 1,
        overallStatus: 'degraded',
      },
      migrations: {
        appliedCount: 9,
        availableLocalCount: 11,
        error: undefined,
        latestAppliedAt: '2026-03-31T09:00:00.000Z',
        migrationTableAccessible: true,
        pendingLocalCount: 2,
        status: 'degraded',
      },
      notifications: {
        enabledChannelCount: 2,
        failedDeliveryCount: 1,
        lastAttemptedAt: '2026-03-31T09:59:00.000Z',
        ready: true,
        recentOutcomeCount: 3,
        retryingDeliveryCount: 2,
        status: 'degraded',
        succeededDeliveryCount: 0,
        summary:
          'Notifications have 1 terminal failure(s) and 2 retrying delivery attempt(s) in current runtime visibility.',
        templateCount: 6,
        terminalFailureCount: 1,
      },
      service: 'workload-tracking-platform',
      timestamp: '2026-03-31T10:00:00.000Z',
    });

    renderWithRouter();

    expect((await screen.findAllByText('Timeout while reaching provider.')).length).toBeGreaterThan(0);
    expect(screen.getByText('Notification failures')).toBeInTheDocument();
    expect(screen.getByText('Database schema')).toBeInTheDocument();
    expect(screen.getByText('1 terminal')).toBeInTheDocument();
    expect(screen.getByText('2 degraded')).toBeInTheDocument();
    expect(screen.getByText('2 pending')).toBeInTheDocument();
    expect(screen.getByText('2 retrying')).toBeInTheDocument();
    const integrationSection = screen
      .getByRole('heading', { name: 'Integration Health Summary' })
      .closest('section');
    expect(integrationSection).not.toBeNull();
    expect(
      within(integrationSection as HTMLElement).getByText('Radius match strategy disabled.'),
    ).toBeInTheDocument();
    expect(within(integrationSection as HTMLElement).getByText('Never synced')).toBeInTheDocument();
  });
});

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/admin/monitoring']}>
      <Routes>
        <Route element={<MonitoringPage />} path="/admin/monitoring" />
      </Routes>
    </MemoryRouter>,
  );
}
