import { ConflictException, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';

import { Idempotent } from '@src/shared/http/idempotent.decorator';
import { IdempotencyInterceptor } from '@src/shared/http/idempotency.interceptor';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeRow {
  id: string;
  idempotencyKey: string;
  method: string;
  path: string;
  actorId: string | null;
  requestHash: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  responseStatus: number | null;
  responseBody: unknown;
  expiresAt: Date;
  completedAt: Date | null;
}

function buildPrismaStub(rows: FakeRow[]): PrismaService {
  return {
    idempotencyKey: {
      findFirst: async (args: {
        where: {
          idempotencyKey: string;
          method: string;
          path: string;
          actorId: string | null;
        };
      }): Promise<FakeRow | null> => {
        return (
          rows.find(
            (r) =>
              r.idempotencyKey === args.where.idempotencyKey &&
              r.method === args.where.method &&
              r.path === args.where.path &&
              r.actorId === args.where.actorId,
          ) ?? null
        );
      },
      create: async (args: {
        data: Partial<FakeRow> & { idempotencyKey: string };
      }): Promise<FakeRow> => {
        // Simulate the unique constraint: if a matching row already
        // exists (active), throw P2002.
        const conflict = rows.find(
          (r) =>
            r.idempotencyKey === args.data.idempotencyKey &&
            r.method === args.data.method &&
            r.path === args.data.path &&
            r.actorId === (args.data.actorId ?? null) &&
            r.expiresAt.getTime() > Date.now(),
        );
        if (conflict) {
          const err = new Error('Unique constraint failed') as Error & { code: string };
          err.code = 'P2002';
          throw err;
        }
        const row: FakeRow = {
          id: `idk-${rows.length + 1}`,
          idempotencyKey: args.data.idempotencyKey,
          method: args.data.method ?? 'POST',
          path: args.data.path ?? '/',
          actorId: args.data.actorId ?? null,
          requestHash: args.data.requestHash ?? '',
          status: 'PENDING',
          responseStatus: null,
          responseBody: null,
          expiresAt: args.data.expiresAt ?? new Date(Date.now() + 86_400_000),
          completedAt: null,
        };
        rows.push(row);
        return row;
      },
      update: async (args: {
        where: { id: string };
        data: Partial<FakeRow>;
      }): Promise<FakeRow> => {
        const row = rows.find((r) => r.id === args.where.id);
        if (!row) throw new Error('row not found');
        Object.assign(row, args.data);
        return row;
      },
    },
  } as unknown as PrismaService;
}

class IdempotentMarker {
  @Idempotent()
  public async handler(): Promise<unknown> {
    return undefined;
  }
}

function buildContext(args: {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
  actorId: string | null;
}): ExecutionContext {
  const handler = new IdempotentMarker().handler;
  return {
    getHandler: () => handler,
    getClass: () => IdempotentMarker,
    switchToHttp: () => ({
      getRequest: () => ({
        method: args.method,
        originalUrl: args.path,
        headers: args.headers,
        body: args.body,
        principal: args.actorId ? { personId: args.actorId } : undefined,
      }),
      getResponse: () => ({
        statusCode: 200,
        setHeader: () => undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

const REFLECTOR = new Reflector();

describe('IdempotencyInterceptor', () => {
  it('passes through when no @Idempotent metadata is present', async () => {
    const prisma = buildPrismaStub([]);
    const interceptor = new IdempotencyInterceptor(REFLECTOR, prisma);
    const ctx = {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', originalUrl: '/foo', headers: {}, body: {} }),
        getResponse: () => ({ statusCode: 200, setHeader: () => undefined }),
      }),
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of({ result: 'fresh' }) };
    const out = await firstValueFrom(interceptor.intercept(ctx, next));
    expect(out).toEqual({ result: 'fresh' });
  });

  it('passes through when no Idempotency-Key header is supplied', async () => {
    const prisma = buildPrismaStub([]);
    const interceptor = new IdempotencyInterceptor(REFLECTOR, prisma);
    const ctx = buildContext({
      method: 'POST',
      path: '/test',
      headers: {},
      body: { foo: 1 },
      actorId: 'u1',
    });
    const next: CallHandler = { handle: () => of({ ok: true }) };
    const out = await firstValueFrom(interceptor.intercept(ctx, next));
    expect(out).toEqual({ ok: true });
  });

  it('reserves a PENDING row, runs the handler, and stamps it COMPLETED', async () => {
    const rows: FakeRow[] = [];
    const prisma = buildPrismaStub(rows);
    const interceptor = new IdempotencyInterceptor(REFLECTOR, prisma);
    const ctx = buildContext({
      method: 'POST',
      path: '/test',
      headers: { 'idempotency-key': 'k-1' },
      body: { foo: 1 },
      actorId: 'u1',
    });
    const next: CallHandler = { handle: () => of({ ok: true }) };

    const out = await firstValueFrom(interceptor.intercept(ctx, next));
    // Allow the tap() side-effect to flush.
    await new Promise((r) => setTimeout(r, 20));

    expect(out).toEqual({ ok: true });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('COMPLETED');
    expect(rows[0].responseBody).toEqual({ ok: true });
    expect(rows[0].responseStatus).toBe(200);
  });

  it('replays a cached COMPLETED response on second call with same key', async () => {
    const rows: FakeRow[] = [];
    const prisma = buildPrismaStub(rows);
    const interceptor = new IdempotencyInterceptor(REFLECTOR, prisma);
    const ctx = buildContext({
      method: 'POST',
      path: '/test',
      headers: { 'idempotency-key': 'k-replay' },
      body: { x: 7 },
      actorId: 'u1',
    });
    let calls = 0;
    const next: CallHandler = {
      handle: () => {
        calls += 1;
        return of({ side: 'fresh', n: calls });
      },
    };

    await firstValueFrom(interceptor.intercept(ctx, next));
    await new Promise((r) => setTimeout(r, 20));
    const out = await firstValueFrom(interceptor.intercept(ctx, next));

    expect(calls).toBe(1); // handler ran exactly once
    expect(out).toEqual({ side: 'fresh', n: 1 }); // replay matches the original
    expect(rows).toHaveLength(1); // single row, not two
  });

  it('rejects a same-key + different-body call with 409', async () => {
    const rows: FakeRow[] = [];
    const prisma = buildPrismaStub(rows);
    const interceptor = new IdempotencyInterceptor(REFLECTOR, prisma);

    const ctx1 = buildContext({
      method: 'POST',
      path: '/test',
      headers: { 'idempotency-key': 'k-mismatch' },
      body: { a: 1 },
      actorId: 'u1',
    });
    const ctx2 = buildContext({
      method: 'POST',
      path: '/test',
      headers: { 'idempotency-key': 'k-mismatch' },
      body: { a: 2 }, // different body, same key
      actorId: 'u1',
    });
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await firstValueFrom(interceptor.intercept(ctx1, next));
    await new Promise((r) => setTimeout(r, 20));

    await expect(firstValueFrom(interceptor.intercept(ctx2, next))).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects a duplicate-in-flight call (PENDING) with 409', async () => {
    const rows: FakeRow[] = [
      {
        id: 'pre-existing',
        idempotencyKey: 'k-inflight',
        method: 'POST',
        path: '/test',
        actorId: 'u1',
        requestHash:
          // sha256 of JSON.stringify({foo:1})
          '7a38bf81f383f4433948c44e4f8b1dbd07b8525e1e4fab6f72d3e6c5ee5da38b',
        status: 'PENDING',
        responseStatus: null,
        responseBody: null,
        expiresAt: new Date(Date.now() + 60_000),
        completedAt: null,
      },
    ];
    const prisma = buildPrismaStub(rows);
    const interceptor = new IdempotencyInterceptor(REFLECTOR, prisma);

    const ctx = buildContext({
      method: 'POST',
      path: '/test',
      headers: { 'idempotency-key': 'k-inflight' },
      body: { foo: 1 },
      actorId: 'u1',
    });
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await expect(firstValueFrom(interceptor.intercept(ctx, next))).rejects.toThrow(
      ConflictException,
    );
  });

  it('marks the row FAILED when the handler throws', async () => {
    const rows: FakeRow[] = [];
    const prisma = buildPrismaStub(rows);
    const interceptor = new IdempotencyInterceptor(REFLECTOR, prisma);
    const ctx = buildContext({
      method: 'POST',
      path: '/test',
      headers: { 'idempotency-key': 'k-fail' },
      body: { x: 1 },
      actorId: 'u1',
    });
    const boom = new Error('boom');
    const next: CallHandler = { handle: () => throwError(() => boom) };

    await expect(firstValueFrom(interceptor.intercept(ctx, next))).rejects.toThrow('boom');
    await new Promise((r) => setTimeout(r, 20));

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('FAILED');
  });

  it('lets a FAILED row be retried (renewed to PENDING then COMPLETED)', async () => {
    const rows: FakeRow[] = [
      {
        id: 'failed-row',
        idempotencyKey: 'k-retry',
        method: 'POST',
        path: '/test',
        actorId: 'u1',
        requestHash: 'old-hash',
        status: 'FAILED',
        responseStatus: null,
        responseBody: null,
        expiresAt: new Date(Date.now() + 60_000),
        completedAt: new Date(Date.now() - 1_000),
      },
    ];
    const prisma = buildPrismaStub(rows);
    const interceptor = new IdempotencyInterceptor(REFLECTOR, prisma);
    const ctx = buildContext({
      method: 'POST',
      path: '/test',
      headers: { 'idempotency-key': 'k-retry' },
      body: { x: 1 },
      actorId: 'u1',
    });
    const next: CallHandler = { handle: () => of({ ok: true, retried: true }) };

    const out = await firstValueFrom(interceptor.intercept(ctx, next));
    await new Promise((r) => setTimeout(r, 20));

    expect(out).toEqual({ ok: true, retried: true });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('COMPLETED');
  });
});
