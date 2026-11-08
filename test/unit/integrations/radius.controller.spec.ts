import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { RadiusAccountSyncService } from '@src/modules/integrations/radius/application/radius-account-sync.service';
import { RadiusReconciliationQueryService } from '@src/modules/integrations/radius/application/radius-reconciliation-query.service';
import { RadiusStatusService } from '@src/modules/integrations/radius/application/radius-status.service';
import { InMemoryRadiusAccountAdapter } from '@src/modules/integrations/radius/infrastructure/adapters/in-memory-radius-account.adapter';
import { RadiusController } from '@src/modules/integrations/radius/presentation/radius.controller';

describe('RadiusController — W2-10 remediation parity', () => {
  function makeFixture(adapter?: InMemoryRadiusAccountAdapter) {
    const auditRecords: unknown[] = [];
    const auditLogger = {
      record: jest.fn((input: unknown) => {
        auditRecords.push(input);
      }),
    } as unknown as AuditLoggerService;
    const syncService = {
      syncAccounts: jest.fn(),
    } as unknown as RadiusAccountSyncService;
    const statusService = {
      getStatus: jest.fn(),
    } as unknown as RadiusStatusService;
    const reconciliationQueryService = {
      getReview: jest.fn(),
    } as unknown as RadiusReconciliationQueryService;
    const probeAdapter = adapter ?? new InMemoryRadiusAccountAdapter();
    const controller = new RadiusController(
      syncService,
      statusService,
      reconciliationQueryService,
      probeAdapter,
      auditLogger,
    );
    return { controller, auditLogger, auditRecords, syncService, probeAdapter };
  }

  describe('POST /integrations/radius/test-connection', () => {
    it('returns reachable=true with latencyMs when the adapter responds', async () => {
      const { controller, auditRecords } = makeFixture();

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
        fetchAccounts: jest.fn().mockRejectedValue(new Error('radius unreachable')),
      } as unknown as InMemoryRadiusAccountAdapter;
      const { controller, auditRecords } = makeFixture(adapter);

      const result = await controller.testConnection();

      expect(result.reachable).toBe(false);
      expect(result.errorMessage).toBe('radius unreachable');
      expect(typeof result.latencyMs).toBe('number');
      expect(auditRecords).toHaveLength(1);
      expect((auditRecords[0] as { changeSummary: string }).changeSummary).toMatch(/failed/i);
    });
  });

  describe('POST /integrations/radius/retry-sync', () => {
    it('runs the sync service and tags the audit row with initiatedAs="retry"', async () => {
      const { controller, syncService, auditRecords } = makeFixture();
      (syncService.syncAccounts as jest.Mock).mockResolvedValue({
        accountsImported: 3,
        accountsLinked: 2,
        syncedAccountIds: ['a-1'],
        unmatchedAccounts: 1,
      });

      const result = await controller.retrySync();

      expect(syncService.syncAccounts).toHaveBeenCalledTimes(1);
      expect(result.accountsImported).toBe(3);
      expect(result.accountsLinked).toBe(2);
      expect(auditRecords).toHaveLength(1);
      const recorded = auditRecords[0] as {
        metadata: { initiatedAs: string };
        changeSummary: string;
      };
      expect(recorded.metadata.initiatedAs).toBe('retry');
      expect(recorded.changeSummary).toMatch(/retry/i);
    });

    it('records a failed retry audit row and rethrows when the sync fails', async () => {
      const { controller, syncService, auditRecords } = makeFixture();
      (syncService.syncAccounts as jest.Mock).mockRejectedValue(new Error('radius busted'));

      await expect(controller.retrySync()).rejects.toThrow('radius busted');

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
