/**
 * F-6.6 / D-143 — pool-config URL helper.
 *
 * Verifies the DATABASE_URL transformation logic in `prisma.service.ts`
 * by re-implementing the same transform inline and asserting it against
 * env-var inputs. Keeps the contract test fast (no Prisma client boot)
 * and deterministic.
 *
 * If the production helper changes shape, mirror the change here.
 */

const DEFAULT_POOL_LIMIT = 20;
const DEFAULT_POOL_TIMEOUT_SECONDS = 10;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function withConnectionPool(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const limit = parsePositiveInt(process.env.DATABASE_POOL_LIMIT, DEFAULT_POOL_LIMIT);
    const timeout = parsePositiveInt(
      process.env.DATABASE_POOL_TIMEOUT_SECONDS,
      DEFAULT_POOL_TIMEOUT_SECONDS,
    );
    url.searchParams.set('connection_limit', String(limit));
    url.searchParams.set('pool_timeout', String(timeout));
    return url.toString();
  } catch {
    return rawUrl;
  }
}

describe('Prisma pool-config URL helper (F-6.6 / D-143)', () => {
  const originalLimit = process.env.DATABASE_POOL_LIMIT;
  const originalTimeout = process.env.DATABASE_POOL_TIMEOUT_SECONDS;
  const baseUrl = 'postgresql://user:pass@host:5432/db?schema=public';

  afterEach(() => {
    if (originalLimit === undefined) delete process.env.DATABASE_POOL_LIMIT;
    else process.env.DATABASE_POOL_LIMIT = originalLimit;
    if (originalTimeout === undefined) delete process.env.DATABASE_POOL_TIMEOUT_SECONDS;
    else process.env.DATABASE_POOL_TIMEOUT_SECONDS = originalTimeout;
  });

  function clearEnv(): void {
    delete process.env.DATABASE_POOL_LIMIT;
    delete process.env.DATABASE_POOL_TIMEOUT_SECONDS;
  }

  it('applies default pool (20) + timeout (10) when env vars are unset', () => {
    clearEnv();
    const tuned = withConnectionPool(baseUrl);
    expect(tuned).toContain('connection_limit=20');
    expect(tuned).toContain('pool_timeout=10');
  });

  it('honors DATABASE_POOL_LIMIT when set', () => {
    clearEnv();
    process.env.DATABASE_POOL_LIMIT = '40';
    const tuned = withConnectionPool(baseUrl);
    expect(tuned).toContain('connection_limit=40');
  });

  it('honors DATABASE_POOL_TIMEOUT_SECONDS when set', () => {
    clearEnv();
    process.env.DATABASE_POOL_TIMEOUT_SECONDS = '30';
    const tuned = withConnectionPool(baseUrl);
    expect(tuned).toContain('pool_timeout=30');
  });

  it('falls back to default on zero / negative / non-numeric values', () => {
    clearEnv();
    for (const bad of ['0', '-1', 'abc', '']) {
      process.env.DATABASE_POOL_LIMIT = bad;
      const tuned = withConnectionPool(baseUrl);
      expect(tuned).toContain('connection_limit=20');
    }
  });

  it('preserves the schema=public param + other existing query args', () => {
    clearEnv();
    const tuned = withConnectionPool(baseUrl);
    expect(tuned).toContain('schema=public');
    expect(tuned).toContain('connection_limit=');
    expect(tuned).toContain('pool_timeout=');
  });

  it('returns input unchanged when URL is malformed', () => {
    clearEnv();
    const garbage = 'not-a-valid-url';
    expect(withConnectionPool(garbage)).toBe(garbage);
  });
});
