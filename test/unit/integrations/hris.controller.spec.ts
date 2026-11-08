import { HrisController } from '@src/modules/integrations/hris/presentation/hris.controller';
import { HrisSyncService } from '@src/modules/integrations/hris/application/hris-sync.service';

describe('HrisController — Test Connection (W2-11)', () => {
  function makeController(): { controller: HrisController; service: HrisSyncService } {
    const service = new HrisSyncService();
    const controller = new HrisController(service);
    return { controller, service };
  }

  describe('POST /admin/hris/test', () => {
    it('returns reachable=false with errorMessage when adapter is "none"', async () => {
      const { controller } = makeController();

      const result = await controller.testConnection();

      expect(result.adapter).toBe('none');
      expect(result.reachable).toBe(false);
      expect(typeof result.latencyMs).toBe('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.errorMessage).toBe('No active HRIS adapter configured.');
    });

    it('returns reachable=true with latencyMs when the bamboohr adapter responds', async () => {
      const { controller, service } = makeController();
      service.updateConfig({
        activeAdapter: 'bamboohr',
        bamboohr: { apiKey: 'k', subdomain: 'acme' },
      });

      const result = await controller.testConnection();

      expect(result.adapter).toBe('bamboohr');
      expect(result.reachable).toBe(true);
      expect(typeof result.latencyMs).toBe('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.errorMessage).toBeUndefined();
    });

    it('returns reachable=true for the workday adapter when configured', async () => {
      const { controller, service } = makeController();
      service.updateConfig({
        activeAdapter: 'workday',
        workday: { tenantUrl: 'https://wd2.example/acme', clientId: 'c', clientSecret: 's' },
      });

      const result = await controller.testConnection();

      expect(result.adapter).toBe('workday');
      expect(result.reachable).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });
  });
});
