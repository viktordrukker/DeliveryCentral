import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const drill = require(path.resolve(__dirname, '../../../scripts/rollback-drill.cjs')) as {
  parseArgs: (argv: string[]) => Record<string, unknown>;
  assertSafeTarget: (t: string) => void;
  quantile: (sorted: number[], q: number) => number;
  runDrill: (
    args: Record<string, unknown>,
    deps?: Record<string, unknown>,
  ) => Promise<{ summary: Record<string, unknown>; exitCode: number }>;
};

describe('rollback-drill (ROLLBACK-DRILL)', () => {
  describe('parseArgs()', () => {
    it('returns sensible defaults', () => {
      const args = drill.parseArgs([]);
      expect(args.iterations).toBe(5);
      expect(args.maxRollbackMs).toBe(30_000);
      expect(args.key).toBe('flag.dsRefresh');
    });

    it('reads overrides from flags', () => {
      const args = drill.parseArgs([
        '--iterations',
        '3',
        '--max-rollback-ms',
        '15000',
        '--key',
        'flag.workspaceMe',
        '--json',
      ]);
      expect(args.iterations).toBe(3);
      expect(args.maxRollbackMs).toBe(15_000);
      expect(args.key).toBe('flag.workspaceMe');
      expect(args.json).toBe(true);
    });
  });

  describe('assertSafeTarget()', () => {
    it('accepts v2-staging URLs', () => {
      expect(() =>
        drill.assertSafeTarget('https://deliverit-test-v2.agentic.uz'),
      ).not.toThrow();
    });

    it('accepts localhost / 127.0.0.1', () => {
      expect(() => drill.assertSafeTarget('http://localhost:3000')).not.toThrow();
      expect(() => drill.assertSafeTarget('http://127.0.0.1:3000')).not.toThrow();
    });

    it('refuses obvious production URLs', () => {
      expect(() => drill.assertSafeTarget('https://prod.example.com')).toThrow(/production/i);
      expect(() => drill.assertSafeTarget('https://deliverit.agentic.uz')).toThrow(/production/i);
    });

    it('requires a non-empty target', () => {
      expect(() => drill.assertSafeTarget('')).toThrow();
      expect(() => drill.assertSafeTarget(undefined as unknown as string)).toThrow();
    });
  });

  describe('quantile()', () => {
    it('returns 0 for an empty sample', () => {
      expect(drill.quantile([], 0.5)).toBe(0);
    });

    it('returns P50/P95 from a sorted ascending sample', () => {
      const sample = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      expect(drill.quantile(sample, 0.5)).toBeGreaterThanOrEqual(50);
      expect(drill.quantile(sample, 0.95)).toBeGreaterThanOrEqual(90);
    });
  });

  describe('runDrill()', () => {
    function makeFakeBackend() {
      let stored: unknown = false;
      const calls: Array<{ method: string; url: string; body?: unknown }> = [];
      const fakeFetch = async (url: string, init: { method?: string; body?: string } = {}) => {
        const method = init.method ?? 'GET';
        calls.push({ method, url, body: init.body ? JSON.parse(init.body) : undefined });

        if (method === 'PATCH' && url.includes('/admin/platform-settings/')) {
          const body = JSON.parse(init.body ?? '{}');
          stored = body.value;
          return {
            ok: true,
            status: 200,
            json: async () => ({ key: 'flag.dsRefresh', value: stored }),
            text: async () => '',
          };
        }

        if (method === 'GET' && url.includes('/_internal/runtime-flags')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ key: 'flag.dsRefresh', value: stored, cachedAt: 'now' }),
            text: async () => '',
          };
        }

        return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
      };
      return { fakeFetch, calls };
    }

    function makeFakeClock() {
      let t = 0;
      return {
        now: () => t,
        sleep: async (ms: number) => {
          t += ms;
        },
        advance: (ms: number) => {
          t += ms;
        },
      };
    }

    it('runs 5 iterations end-to-end and reports P50/P95/MAX', async () => {
      const { fakeFetch } = makeFakeBackend();
      const clock = makeFakeClock();
      const logger = { log: jest.fn(), error: jest.fn() } as unknown as Console;

      const result = await drill.runDrill(
        {
          target: 'https://deliverit-test-v2.agentic.uz',
          token: 'fake-token',
          key: 'flag.dsRefresh',
          iterations: 5,
          maxRollbackMs: 30_000,
          pollIntervalMs: 100,
          pollTimeoutMs: 5_000,
          json: false,
        },
        { fetch: fakeFetch, clock, logger },
      );

      expect(result.exitCode).toBe(0);
      expect(result.summary.iterations).toBe(5);
      expect(Array.isArray(result.summary.samples)).toBe(true);
      expect((result.summary.samples as unknown[]).length).toBe(5);
      expect(result.summary.pass).toBe(true);
      expect(typeof result.summary.p50RollbackMs).toBe('number');
      expect(typeof result.summary.p95RollbackMs).toBe('number');
      expect(typeof result.summary.maxObservedRollbackMs).toBe('number');
    });

    it('fails when token is missing', async () => {
      await expect(
        drill.runDrill(
          {
            target: 'https://deliverit-test-v2.agentic.uz',
            token: '',
            key: 'flag.dsRefresh',
            iterations: 1,
            maxRollbackMs: 30_000,
            pollIntervalMs: 100,
            pollTimeoutMs: 5_000,
            json: false,
          },
          {
            fetch: () => Promise.reject(new Error('not used')),
            clock: { now: () => 0, sleep: async () => undefined },
            logger: { log: () => undefined, error: () => undefined } as unknown as Console,
          },
        ),
      ).rejects.toThrow(/ADMIN_TOKEN/);
    });
  });
});
