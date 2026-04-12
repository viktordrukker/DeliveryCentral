import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Injectable } from '@nestjs/common';

import { InMemoryAuditLogStore } from '@src/modules/audit-observability/application/in-memory-audit-log.store';
import { JiraStatusService } from '@src/modules/integrations/jira/application/jira-status.service';
import { M365DirectoryStatusService } from '@src/modules/integrations/m365/application/m365-directory-status.service';
import { RadiusStatusService } from '@src/modules/integrations/radius/application/radius-status.service';
import { NotificationOutcomeQueryService } from '@src/modules/notifications/application/notification-outcome-query.service';
import { PrismaNotificationChannelRepository } from '@src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-channel.repository';
import { PrismaNotificationTemplateRepository } from '@src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-template.repository';
import { AppConfig } from '@src/shared/config/app-config';
import { PrismaService } from '@src/shared/persistence/prisma.service';

@Injectable()
export class HealthService {
  public constructor(
    private readonly appConfig: AppConfig,
    private readonly prisma: PrismaService,
    private readonly jiraStatusService: JiraStatusService,
    private readonly m365DirectoryStatusService: M365DirectoryStatusService,
    private readonly radiusStatusService: RadiusStatusService,
    private readonly notificationOutcomeQueryService: NotificationOutcomeQueryService,
    private readonly notificationChannelRepository: PrismaNotificationChannelRepository,
    private readonly notificationTemplateRepository: PrismaNotificationTemplateRepository,
    private readonly auditLogStore: InMemoryAuditLogStore,
  ) {}

  public async getHealth(): Promise<{
    diagnosticsPath: string;
    environment: string;
    service: string;
    status: string;
    timestamp: string;
  }> {
    return {
      diagnosticsPath: '/diagnostics',
      environment: this.appConfig.nodeEnv,
      service: this.appConfig.serviceName,
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  public async getReadiness(): Promise<{
    checks: Array<{ name: string; status: 'degraded' | 'ready'; summary: string }>;
    status: 'degraded' | 'ready';
    timestamp: string;
  }> {
    const diagnostics = await this.getDiagnostics();

    const checks = [
      {
        name: 'database',
        status:
          diagnostics.database.connected && diagnostics.database.schemaHealthy
            ? 'ready'
            : 'degraded',
        summary:
          diagnostics.database.connected && diagnostics.database.schemaHealthy
            ? `Database connection available with schema sanity on ${diagnostics.database.host}.`
            : diagnostics.database.error ??
              diagnostics.database.schemaError ??
              'Database connection unavailable.',
      },
      {
        name: 'migrations',
        status: diagnostics.migrations.status,
        summary:
          diagnostics.migrations.status === 'ready'
            ? `Applied ${diagnostics.migrations.appliedCount} of ${diagnostics.migrations.availableLocalCount} local migrations.`
            : diagnostics.migrations.error ??
              `Migration sanity degraded. ${diagnostics.migrations.pendingLocalCount} local migration(s) appear unapplied.`,
      },
      {
        name: 'integrations',
        status: diagnostics.integrations.overallStatus === 'degraded' ? 'degraded' : 'ready',
        summary:
          diagnostics.integrations.overallStatus === 'ready'
            ? `${diagnostics.integrations.configuredCount} integrations configured with no degraded providers.`
            : `${diagnostics.integrations.degradedCount} degraded integration provider(s) detected.`,
      },
      {
        name: 'notifications',
        status: diagnostics.notifications.status,
        summary:
          diagnostics.notifications.status === 'ready'
            ? 'Notification channels and templates are available with no recent delivery degradation.'
            : diagnostics.notifications.summary,
      },
    ] as const;

    return {
      checks: [...checks],
      status: checks.some((check) => check.status === 'degraded') ? 'degraded' : 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  public async getDiagnostics(): Promise<{
    auditVisibility: {
      lastBusinessAuditAt: string | null;
      totalBusinessAuditRecords: number;
    };
    database: {
      connected: boolean;
      host: string;
      latencyMs: number | null;
      port: number | null;
      schema: string | null;
      schemaError?: string;
      schemaHealthy: boolean;
      serverTime?: string;
      version?: string;
      error?: string;
    };
    integrations: {
      configuredCount: number;
      degradedCount: number;
      items: Array<{
        capabilities: string[];
        lastSyncAt?: string;
        lastOutcome?: string;
        name: string;
        status: string;
        summary?: string;
        summaryMetrics: Array<{ label: string; value: number | string }>;
      }>;
      neverSyncedCount: number;
      overallStatus: 'degraded' | 'ready';
    };
    migrations: {
      appliedCount: number;
      availableLocalCount: number;
      latestAppliedAt: string | null;
      migrationTableAccessible: boolean;
      pendingLocalCount: number;
      status: 'degraded' | 'ready';
      error?: string;
    };
    notifications: {
      enabledChannelCount: number;
      failedDeliveryCount: number;
      lastAttemptedAt: string | null;
      ready: boolean;
      recentOutcomeCount: number;
      retryingDeliveryCount: number;
      status: 'degraded' | 'ready';
      succeededDeliveryCount: number;
      summary: string;
      templateCount: number;
      terminalFailureCount: number;
    };
    service: string;
    timestamp: string;
  }> {
    const databaseUrl = new URL(this.appConfig.databaseUrl);
    const database = {
      connected: false,
      host: databaseUrl.hostname,
      latencyMs: null,
      port: databaseUrl.port ? Number(databaseUrl.port) : null,
      schema: databaseUrl.searchParams.get('schema'),
      schemaHealthy: false,
    } as {
      connected: boolean;
      error?: string;
      host: string;
      latencyMs: number | null;
      port: number | null;
      schema: string | null;
      schemaError?: string;
      schemaHealthy: boolean;
      serverTime?: string;
      version?: string;
    };

    const migrations = {
      appliedCount: 0,
      availableLocalCount: 0,
      latestAppliedAt: null,
      migrationTableAccessible: false,
      pendingLocalCount: 0,
      status: 'degraded',
    } as {
      appliedCount: number;
      availableLocalCount: number;
      error?: string;
      latestAppliedAt: string | null;
      migrationTableAccessible: boolean;
      pendingLocalCount: number;
      status: 'degraded' | 'ready';
    };

    const connectivityStartedAt = Date.now();
    try {
      const connectivityResult = (await this.prisma.$queryRawUnsafe(
        'SELECT version() as version, NOW()::text as server_time',
      )) as Array<{ server_time: string; version: string }>;
      database.connected = true;
      database.latencyMs = Date.now() - connectivityStartedAt;
      database.serverTime = connectivityResult[0]?.server_time;
      database.version = connectivityResult[0]?.version;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database diagnostics failed.';
      database.error = message;
    }

    try {
      const migrationRows = (await this.prisma.$queryRawUnsafe(
        'SELECT finished_at FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC',
      )) as Array<{ finished_at: Date }>;

      migrations.appliedCount = migrationRows.length;
      migrations.latestAppliedAt = migrationRows[0]?.finished_at?.toISOString() ?? null;
      migrations.migrationTableAccessible = true;
      database.schemaHealthy = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Migration table diagnostics failed.';
      migrations.error = message;
      database.schemaError = message;
    }

    try {
      const localMigrationRoot = join(process.cwd(), 'prisma', 'migrations');
      const localMigrationEntries = await readdir(localMigrationRoot, { withFileTypes: true });
      migrations.availableLocalCount = localMigrationEntries.filter(
        (entry) => entry.isDirectory() && !entry.name.startsWith('.'),
      ).length;
    } catch (error) {
      migrations.error =
        migrations.error ??
        (error instanceof Error ? error.message : 'Local migration directory unavailable.');
    }

    migrations.pendingLocalCount = Math.max(
      migrations.availableLocalCount - migrations.appliedCount,
      0,
    );
    migrations.status =
      database.connected &&
      migrations.migrationTableAccessible &&
      migrations.appliedCount > 0 &&
      migrations.pendingLocalCount === 0
        ? 'ready'
        : 'degraded';

    const [m365Status, radiusStatus] = await Promise.all([
      this.m365DirectoryStatusService.getStatus(),
      this.radiusStatusService.getStatus(),
    ]);
    const jiraStatus = this.jiraStatusService.getStatus();
    const notificationOutcomes = await this.notificationOutcomeQueryService.listRecent(25);

    const integrationItems = [
      {
        capabilities: ['project_sync', ...(jiraStatus.supportsWorkEvidence ? ['work_evidence'] : [])],
        lastSyncAt: jiraStatus.lastProjectSyncAt,
        lastOutcome: jiraStatus.lastProjectSyncOutcome,
        name: 'jira',
        status:
          jiraStatus.lastProjectSyncOutcome === 'failed'
            ? 'degraded'
            : jiraStatus.status,
        summary: jiraStatus.lastProjectSyncSummary,
        summaryMetrics: [
          {
            label: 'Project Sync',
            value: jiraStatus.supportsProjectSync ? 'supported' : 'not_supported',
          },
          {
            label: 'Work Evidence',
            value: jiraStatus.supportsWorkEvidence ? 'supported' : 'not_supported',
          },
        ],
      },
      {
        capabilities: ['directory_sync', ...(m365Status.supportsManagerSync ? ['manager_sync'] : [])],
        lastSyncAt: m365Status.lastDirectorySyncAt,
        lastOutcome: m365Status.lastDirectorySyncOutcome,
        name: 'm365',
        status:
          m365Status.lastDirectorySyncOutcome === 'failed'
            ? 'degraded'
            : m365Status.status,
        summary: m365Status.lastDirectorySyncSummary,
        summaryMetrics: [
          { label: 'Linked Identities', value: m365Status.linkedIdentityCount },
          { label: 'Match Strategy', value: m365Status.matchStrategy },
        ],
      },
      {
        capabilities: ['account_sync'],
        lastSyncAt: radiusStatus.lastAccountSyncAt,
        lastOutcome: radiusStatus.lastAccountSyncOutcome,
        name: 'radius',
        status:
          radiusStatus.lastAccountSyncOutcome === 'failed'
            ? 'degraded'
            : radiusStatus.status,
        summary: radiusStatus.lastAccountSyncSummary,
        summaryMetrics: [
          { label: 'Linked Accounts', value: radiusStatus.linkedAccountCount },
          { label: 'Unmatched Accounts', value: radiusStatus.unlinkedAccountCount },
        ],
      },
    ];

    const enabledChannels = await this.notificationChannelRepository.listEnabled();
    const activeTemplates = await this.notificationTemplateRepository.listActive();
    const { items: auditRecords } = this.auditLogStore.list();
    const notificationFailureCount = auditRecords.filter(
      (record) =>
        record.actionType === 'notification.send_result' &&
        record.metadata.status === 'FAILED_TERMINAL',
    ).length;
    const retryingNotificationCount = auditRecords.filter(
      (record) =>
        record.actionType === 'notification.send_result' &&
        record.metadata.status === 'RETRYING',
    ).length;
    const succeededNotificationCount = auditRecords.filter(
      (record) =>
        record.actionType === 'notification.send_result' &&
        record.metadata.status === 'SUCCEEDED',
    ).length;
    const lastNotificationAttemptAt =
      notificationOutcomes[0]?.attemptedAt ??
      auditRecords.find((record) => record.actionType === 'notification.send_result')?.occurredAt ??
      null;
    const notificationsReady = enabledChannels.length > 0 && activeTemplates.length > 0;
    const notificationStatus =
      notificationsReady && notificationFailureCount === 0 && retryingNotificationCount === 0
        ? 'ready'
        : 'degraded';
    const degradedIntegrationCount = integrationItems.filter((item) => item.status === 'degraded')
      .length;
    const neverSyncedIntegrationCount = integrationItems.filter((item) => !item.lastSyncAt).length;

    return {
      auditVisibility: {
        lastBusinessAuditAt: auditRecords[0]?.occurredAt ?? null,
        totalBusinessAuditRecords: auditRecords.length,
      },
      database,
      integrations: {
        configuredCount: integrationItems.filter((item) => item.status !== 'not_configured').length,
        degradedCount: degradedIntegrationCount,
        items: integrationItems,
        neverSyncedCount: neverSyncedIntegrationCount,
        overallStatus: degradedIntegrationCount > 0 ? 'degraded' : 'ready',
      },
      migrations,
      notifications: {
        enabledChannelCount: enabledChannels.length,
        failedDeliveryCount: notificationFailureCount,
        lastAttemptedAt: lastNotificationAttemptAt,
        ready: notificationsReady,
        recentOutcomeCount: notificationOutcomes.length,
        retryingDeliveryCount: retryingNotificationCount,
        status: notificationStatus,
        succeededDeliveryCount: succeededNotificationCount,
        summary:
          notificationStatus === 'ready'
            ? 'Notification channels and templates are configured with no recent degraded outcomes.'
            : `Notifications have ${notificationFailureCount} terminal failure(s) and ${retryingNotificationCount} retrying delivery attempt(s) in current runtime visibility.`,
        templateCount: activeTemplates.length,
        terminalFailureCount: notificationFailureCount,
      },
      service: this.appConfig.serviceName,
      timestamp: new Date().toISOString(),
    };
  }
}
