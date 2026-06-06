import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { M365DirectoryReconciliationQueryService } from '@src/modules/integrations/m365/application/m365-directory-reconciliation-query.service';
import { M365DirectoryStatusService } from '@src/modules/integrations/m365/application/m365-directory-status.service';
import { M365DirectorySyncService } from '@src/modules/integrations/m365/application/m365-directory-sync.service';
import { InMemoryM365DirectoryAdapter } from '@src/modules/integrations/m365/infrastructure/adapters/in-memory-m365-directory.adapter';
import { M365DirectoryController } from '@src/modules/integrations/m365/presentation/m365-directory.controller';

describe('M365DirectoryController — W2-10 remediation parity', () => {
  function makeFixture(adapter?: InMemoryM365DirectoryAdapter) {
    const auditRecords: unknown[] = [];
    const auditLogger = {
      record: jest.fn((input: unknown) => {
        auditRecords.push(input);
      }),
    } as unknown as AuditLoggerService;
    const syncService = {
      syncDirectory: jest.fn(),
    } as unknown as M365DirectorySyncService;
    const statusService = {
      getStatus: jest.fn(),
    } as unknown as M365DirectoryStatusService;
    const reconciliationQueryService = {
      getReview: jest.fn(),
    } as unknown as M365DirectoryReconciliationQueryService;
    const probeAdapter = adapter ?? new InMemoryM365DirectoryAdapter();
    const controller = new M365DirectoryController(
      syncService,
      statusService,
      reconciliationQueryService,
      probeAdapter,
      auditLogger,
    );
    return { controller, auditLogger, auditRecords, syncService, probeAdapter };
  }

  describe('POST /integrations/m365/directory/test-connection', () => {
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
        fetchUsers: jest.fn().mockRejectedValue(new Error('m365 unreachable')),
      } as unknown as InMemoryM365DirectoryAdapter;
      const { controller, auditRecords } = makeFixture(adapter);

      const result = await controller.testConnection();

      expect(result.reachable).toBe(false);
      expect(result.errorMessage).toBe('m365 unreachable');
      expect(typeof result.latencyMs).toBe('number');
      expect(auditRecords).toHaveLength(1);
      expect((auditRecords[0] as { changeSummary: string }).changeSummary).toMatch(/failed/i);
    });
  });

  describe('POST /integrations/m365/directory/retry-sync', () => {
    it('runs the sync service and tags the audit row with initiatedAs="retry"', async () => {
      const { controller, syncService, auditRecords } = makeFixture();
      (syncService.syncDirectory as jest.Mock).mockResolvedValue({
        employeesCreated: 1,
        employeesLinked: 2,
        managerMappingsResolved: 0,
        syncedPersonIds: ['p-1'],
      });

      const result = await controller.retrySync();

      expect(syncService.syncDirectory).toHaveBeenCalledTimes(1);
      expect(result.employeesCreated).toBe(1);
      expect(result.employeesLinked).toBe(2);
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
      (syncService.syncDirectory as jest.Mock).mockRejectedValue(new Error('directory busted'));

      await expect(controller.retrySync()).rejects.toThrow('directory busted');

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
