import type { Prisma } from '@prisma/client';

/**
 * DM-7.5-4 — tenant resolver Prisma middleware.
 *
 * Reads the per-request tenant id from AsyncLocalStorage (populated
 * by a NestJS request-scoped interceptor; see DM-7.5-4b code wiring
 * follow-up) and issues `SET LOCAL app.current_tenant_id = '…'` on
 * every query so the RLS policies in DM-7.5-5 see the correct tenant.
 *
 * Registered via `registerTenantResolverMiddleware(prisma)`. Not yet
 * wired into `PrismaService` — cutover is gated on
 * `TENANT_ISOLATION_ENABLED=true` + DM-7.5-5 RLS being enabled on
 * each table. Runs alongside existing middlewares without interfering.
 *
 * Interaction with transactions: Prisma $transaction creates a new
 * session; this middleware runs per-query so the SET LOCAL applies to
 * each query individually (and rolls back with the transaction).
 */

import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantContext {
  tenantId: string | null;
  personId?: string | null;
}

const tenantStore = new AsyncLocalStorage<TenantContext>();

/** Called by the HTTP request interceptor once per request. */
export function runInTenantScope<T>(ctx: TenantContext, fn: () => Promise<T>): Promise<T> {
  return tenantStore.run(ctx, fn);
}

/** Read the current tenant context (mostly for tests + diagnostics). */
export function currentTenantContext(): TenantContext | undefined {
  return tenantStore.getStore();
}

export function registerTenantResolverMiddleware(prisma: {
  $use: (middleware: Prisma.Middleware) => void;
  $executeRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown>;
}): void {
  const middleware: Prisma.Middleware = async (params, next) => {
    const ctx = tenantStore.getStore();
    if (ctx?.tenantId) {
      // SET LOCAL survives the current statement + transaction; not
      // the connection. Prisma transparently pools connections so we
      // must re-SET on every query. Guarded against SQL injection by
      // validating uuid shape.
      if (/^[0-9a-fA-F-]{36}$/.test(ctx.tenantId)) {
        await prisma.$executeRawUnsafe(
          `SELECT set_config('app.current_tenant_id', $1, true)`,
          ctx.tenantId,
        );
      }
    }
    if (ctx?.personId && /^[0-9a-fA-F-]{36}$/.test(ctx.personId)) {
      await prisma.$executeRawUnsafe(
        `SELECT set_config('app.current_person_id', $1, true)`,
        ctx.personId,
      );
    }
    return next(params);
  };
  prisma.$use(middleware);
}
