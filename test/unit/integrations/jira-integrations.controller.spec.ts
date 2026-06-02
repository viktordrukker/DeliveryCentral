import { JiraIntegrationsController } from '@src/modules/integrations/jira/presentation/jira-integrations.controller';
import { JiraProjectSyncService } from '@src/modules/integrations/jira/application/jira-project-sync.service';
import { JiraStatusService } from '@src/modules/integrations/jira/application/jira-status.service';
import { JiraSyncStatusStore } from '@src/modules/integrations/jira/application/jira-sync-status.store';
import { InMemoryJiraProjectAdapter } from '@src/modules/integrations/jira/infrastructure/adapters/in-memory-jira-project.adapter';
import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';

describe('JiraIntegrationsController — remediation actions (V2 §4 item 17)', () => {
  function makeFixture(adapter?: InMemoryJiraProjectAdapter) {
    const store = new JiraSyncStatusStore();
    const statusService = new JiraStatusService(store);
    const auditRecords: unknown[] = [];
    const auditLogger = {
      record: jest.fn((input: unknown) => {
        auditRecords.push(input);
      }),
    } as unknown as AuditLoggerService;
    const syncService = {
      syncProjects: jest.fn(),
    } as unknown as JiraProjectSyncService;
    const probeAdapter = adapter ?? new InMemoryJiraProjectAdapter([]);
    const controller = new JiraIntegrationsController(
      syncService,
      statusService,
      store,
      probeAdapter,
      auditLogger,
    );
    return { controller, store, auditLogger, auditRecords, syncService, probeAdapter };
  }

  describe('POST /integrations/jira/reset-sync', () => {
    it('clears the status-store snapshot and writes an audit row', () => {
      const { controller, store, auditRecords } = makeFixture();
      store.recordFailure('Boom');

      const result = controller.resetSync();

      expect(result).toEqual({ reset: true });
      expect(store.getSnapshot()).toEqual({});
      expect(auditRecords).toHaveLength(1);
      expect((auditRecords[0] as { actionType: string }).actionType).toBe(
        'integration.sync_reset',
      );
    });

    it('is idempotent on an already-empty store', () => {
      const { controller, store } = makeFixture();
      controller.resetSync();
      const second = controller.resetSync();
      expect(second).toEqual({ reset: true });
      expect(store.getSnapshot()).toEqual({});
    });
  });

  describe('POST /integrations/jira/test-connection', () => {
    it('returns reachable=true with latencyMs when the adapter responds', async () => {
      const adapter = new InMemoryJiraProjectAdapter([]);
      const { controller, auditRecords } = makeFixture(adapter);

      const result = await controller.testConnection();

      expect(result.reachable).toBe(true);
      expect(typeof result.latencyMs).toBe('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.errorMessage).toBeUndefined();
      expect(auditRecords).toHaveLength(1);
      expect((auditRecords[0] as { actionType: string }).actionType).toBe(
        'integration.test_connection',
      );
    });

    it('returns reachable=false with errorMessage when the adapter throws', async () => {
      const adapter = {
        fetchProjects: jest.fn().mockRejectedValue(new Error('jira unreachable')),
      } as unknown as InMemoryJiraProjectAdapter;
      const { controller, auditRecords } = makeFixture(adapter);

      const result = await controller.testConnection();

      expect(result.reachable).toBe(false);
      expect(result.errorMessage).toBe('jira unreachable');
      expect(typeof result.latencyMs).toBe('number');
      expect(auditRecords).toHaveLength(1);
      expect((auditRecords[0] as { changeSummary: string }).changeSummary).toMatch(
        /failed/i,
      );
    });
  });

  describe('POST /integrations/jira/retry-sync', () => {
    it('runs the sync service and tags the audit row with initiatedAs="retry"', async () => {
      const { controller, syncService, auditRecords, store } = makeFixture();
      (syncService.syncProjects as jest.Mock).mockResolvedValue({
        projectsCreated: 1,
        projectsUpdated: 2,
        syncedProjectIds: [{ value: '70000000-0000-0000-0000-000000000001' }],
      });

      const result = await controller.retrySync();

      expect(syncService.syncProjects).toHaveBeenCalledTimes(1);
      expect(result.projectsCreated).toBe(1);
      expect(result.projectsUpdated).toBe(2);
      expect(store.getSnapshot().lastProjectSyncOutcome).toBe('succeeded');
      expect(auditRecords).toHaveLength(1);
      const recorded = auditRecords[0] as {
        metadata: { initiatedAs: string };
        changeSummary: string;
      };
      expect(recorded.metadata.initiatedAs).toBe('retry');
      expect(recorded.changeSummary).toMatch(/retry/i);
    });

    it('records a failed retry audit row and rethrows when the sync fails', async () => {
      const { controller, syncService, auditRecords, store } = makeFixture();
      (syncService.syncProjects as jest.Mock).mockRejectedValue(new Error('sync busted'));

      await expect(controller.retrySync()).rejects.toThrow('sync busted');

      expect(store.getSnapshot().lastProjectSyncOutcome).toBe('failed');
      expect(auditRecords).toHaveLength(1);
      const recorded = auditRecords[0] as {
        metadata: { initiatedAs: string; status: string };
        changeSummary: string;
      };
      expect(recorded.metadata.initiatedAs).toBe('retry');
      expect(recorded.metadata.status).toBe('FAILED');
      expect(recorded.changeSummary).toMatch(/retry/i);
    });
  });
});
