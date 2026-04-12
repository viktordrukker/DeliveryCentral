jest.mock('node:fs/promises', () => ({
  readdir: jest.fn(),
}));

import { readdir } from 'node:fs/promises';

import { InMemoryAuditLogStore } from '@src/modules/audit-observability/application/in-memory-audit-log.store';
import { HealthService } from '@src/modules/health/health.service';
import { createSeededInMemoryNotificationChannelRepository } from '@src/modules/notifications/infrastructure/repositories/in-memory/create-seeded-in-memory-notification-channel.repository';
import { createSeededInMemoryNotificationTemplateRepository } from '@src/modules/notifications/infrastructure/repositories/in-memory/create-seeded-in-memory-notification-template.repository';
import { InMemoryNotificationChannelRepository } from '@src/modules/notifications/infrastructure/repositories/in-memory/in-memory-notification-channel.repository';
import { InMemoryNotificationTemplateRepository } from '@src/modules/notifications/infrastructure/repositories/in-memory/in-memory-notification-template.repository';
import { PrismaNotificationChannelRepository } from '@src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-channel.repository';
import { PrismaNotificationTemplateRepository } from '@src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-template.repository';
import { AppConfig } from '@src/shared/config/app-config';

const mockedReaddir = readdir as jest.MockedFunction<typeof readdir>;

describe('HealthService diagnostics', () => {
  afterEach(() => {
    mockedReaddir.mockReset();
  });

  it('returns degraded sub-checks when schema and notifications are unhealthy', async () => {
    mockedReaddir.mockResolvedValue([
      { isDirectory: () => true, name: '20260401000000_init' },
      { isDirectory: () => true, name: '20260402000000_notifications' },
    ] as never);

    const auditLogStore = new InMemoryAuditLogStore();
    auditLogStore.append({
      action: 'notification.send_result',
      actionType: 'notification.send_result',
      actorId: null,
      category: 'notification',
      changeSummary: 'Notification failed terminally through email.',
      details: {
        status: 'FAILED_TERMINAL',
      },
      metadata: {
        status: 'FAILED_TERMINAL',
      },
      occurredAt: '2026-04-04T10:00:00.000Z',
      targetEntityId: 'request-1',
      targetEntityType: 'NOTIFICATION_REQUEST',
    });
    auditLogStore.append({
      action: 'notification.send_result',
      actionType: 'notification.send_result',
      actorId: null,
      category: 'notification',
      changeSummary: 'Notification scheduled for retry through teams.',
      details: {
        status: 'RETRYING',
      },
      metadata: {
        status: 'RETRYING',
      },
      occurredAt: '2026-04-04T10:05:00.000Z',
      targetEntityId: 'request-2',
      targetEntityType: 'NOTIFICATION_REQUEST',
    });

    const notificationTemplateRepository = new InMemoryNotificationTemplateRepository(
      createSeededInMemoryNotificationTemplateRepository(),
    ) as unknown as PrismaNotificationTemplateRepository;
    const disabledChannelRepository = new InMemoryNotificationChannelRepository(
      [],
    ) as unknown as PrismaNotificationChannelRepository;
    const prisma = {
      $queryRawUnsafe: jest.fn(async (query: string) => {
        if (query.includes('SELECT version()')) {
          return [
            {
              server_time: '2026-04-04 10:00:00+00',
              version: 'PostgreSQL 16.2',
            },
          ];
        }

        throw new Error('relation "_prisma_migrations" does not exist');
      }),
    };

    const service = new HealthService(
      createAppConfig(),
      prisma as never,
      {
        getStatus: () => ({
          lastProjectSyncOutcome: 'failed',
          lastProjectSyncSummary: 'Jira sync failed.',
          provider: 'jira',
          status: 'configured',
          supportsProjectSync: true,
          supportsWorkEvidence: true,
        }),
      } as never,
      {
        getStatus: async () => ({
          defaultOrgUnitId: 'org-1',
          lastDirectorySyncOutcome: 'failed',
          lastDirectorySyncSummary: 'Directory sync failed.',
          linkedIdentityCount: 4,
          matchStrategy: 'email',
          provider: 'm365',
          status: 'configured',
          supportsDirectorySync: true,
          supportsManagerSync: true,
        }),
      } as never,
      {
        getStatus: async () => ({
          lastAccountSyncSummary: 'Radius match strategy disabled.',
          linkedAccountCount: 0,
          matchStrategy: 'none',
          provider: 'radius',
          status: 'degraded',
          supportsAccountSync: true,
          unlinkedAccountCount: 3,
        }),
      } as never,
      {
        listRecent: async () => [
          {
            attemptedAt: '2026-04-04T10:05:00.000Z',
            attemptNumber: 1,
            channelKey: 'email',
            errorSummary: 'SMTP temporarily unavailable.',
            eventName: 'assignment.created',
            notificationRequestId: 'request-2',
            status: 'RETRYING',
            targetSummary: 'op***@example.com',
            templateDisplayName: 'Assignment Created Email',
            templateKey: 'assignment-created-email',
          },
          {
            attemptedAt: '2026-04-04T10:00:00.000Z',
            attemptNumber: 1,
            channelKey: 'email',
            errorSummary: 'SMTP rejected message.',
            eventName: 'assignment.created',
            notificationRequestId: 'request-1',
            status: 'FAILED_TERMINAL',
            targetSummary: 'op***@example.com',
            templateDisplayName: 'Assignment Created Email',
            templateKey: 'assignment-created-email',
          },
        ],
      } as never,
      disabledChannelRepository,
      notificationTemplateRepository,
      auditLogStore,
    );

    const diagnostics = await service.getDiagnostics();
    const readiness = await service.getReadiness();

    expect(diagnostics.database.connected).toBe(true);
    expect(diagnostics.database.schemaHealthy).toBe(false);
    expect(diagnostics.database.schemaError).toContain('_prisma_migrations');
    expect(diagnostics.migrations.status).toBe('degraded');
    expect(diagnostics.integrations.degradedCount).toBeGreaterThan(0);
    expect(diagnostics.notifications.status).toBe('degraded');
    expect(diagnostics.notifications.failedDeliveryCount).toBe(1);
    expect(diagnostics.notifications.retryingDeliveryCount).toBe(1);
    expect(diagnostics.notifications.summary).toContain('terminal failure');
    expect(readiness.status).toBe('degraded');
    expect(readiness.checks.find((check) => check.name === 'database')?.status).toBe('degraded');
    expect(readiness.checks.find((check) => check.name === 'notifications')?.status).toBe(
      'degraded',
    );
  });

  it('returns ready diagnostics when all sub-checks are healthy', async () => {
    mockedReaddir.mockResolvedValue([
      { isDirectory: () => true, name: '20260401000000_init' },
    ] as never);

    const service = new HealthService(
      createAppConfig(),
      {
        $queryRawUnsafe: jest.fn(async (query: string) => {
          if (query.includes('SELECT version()')) {
            return [
              {
                server_time: '2026-04-04 10:00:00+00',
                version: 'PostgreSQL 16.2',
              },
            ];
          }

          return [
            {
              finished_at: new Date('2026-04-03T12:00:00.000Z'),
            },
          ];
        }),
      } as never,
      {
        getStatus: () => ({
          lastProjectSyncAt: '2026-04-04T09:00:00.000Z',
          lastProjectSyncOutcome: 'succeeded',
          lastProjectSyncSummary: 'Project sync completed.',
          provider: 'jira',
          status: 'configured',
          supportsProjectSync: true,
          supportsWorkEvidence: true,
        }),
      } as never,
      {
        getStatus: async () => ({
          defaultOrgUnitId: 'org-1',
          lastDirectorySyncAt: '2026-04-04T08:00:00.000Z',
          lastDirectorySyncOutcome: 'succeeded',
          lastDirectorySyncSummary: 'Linked 4 external identities.',
          linkedIdentityCount: 4,
          matchStrategy: 'email',
          provider: 'm365',
          status: 'configured',
          supportsDirectorySync: true,
          supportsManagerSync: true,
        }),
      } as never,
      {
        getStatus: async () => ({
          lastAccountSyncAt: '2026-04-04T08:30:00.000Z',
          lastAccountSyncOutcome: 'succeeded',
          lastAccountSyncSummary: 'Linked 10 account references; 0 remain unmatched.',
          linkedAccountCount: 10,
          matchStrategy: 'email',
          provider: 'radius',
          status: 'configured',
          supportsAccountSync: true,
          unlinkedAccountCount: 0,
        }),
      } as never,
      {
        listRecent: async () => [
          {
            attemptedAt: '2026-04-04T10:10:00.000Z',
            attemptNumber: 1,
            channelKey: 'email',
            eventName: 'assignment.created',
            notificationRequestId: 'request-3',
            status: 'SUCCEEDED',
            targetSummary: 'op***@example.com',
            templateDisplayName: 'Assignment Created Email',
            templateKey: 'assignment-created-email',
          },
        ],
      } as never,
      new InMemoryNotificationChannelRepository(createSeededInMemoryNotificationChannelRepository()) as unknown as PrismaNotificationChannelRepository,
      new InMemoryNotificationTemplateRepository(createSeededInMemoryNotificationTemplateRepository()) as unknown as PrismaNotificationTemplateRepository,
      new InMemoryAuditLogStore(),
    );

    const diagnostics = await service.getDiagnostics();

    expect(diagnostics.database.connected).toBe(true);
    expect(diagnostics.database.schemaHealthy).toBe(true);
    expect(diagnostics.migrations.status).toBe('ready');
    expect(diagnostics.notifications.status).toBe('ready');
    expect(diagnostics.integrations.overallStatus).toBe('ready');
    expect(diagnostics.notifications.recentOutcomeCount).toBe(1);
  });
});

function createAppConfig(): AppConfig {
  return {
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/workload_tracking?schema=public',
    nodeEnv: 'test',
    serviceName: 'workload-tracking-platform',
  } as AppConfig;
}
