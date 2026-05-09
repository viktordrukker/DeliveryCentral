import { createHash } from 'crypto';

import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';

import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { IDEMPOTENT_KEY, IdempotentMetadata } from './idempotent.decorator';

interface ExpressLikeRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  principal?: { personId?: string; userId?: string };
}

interface ExpressLikeResponse {
  setHeader?: (name: string, value: string) => void;
  statusCode?: number;
}

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger('IdempotencyInterceptor');

  public constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<IdempotentMetadata | undefined>(
      IDEMPOTENT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!metadata) return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<ExpressLikeRequest>();
    const response = http.getResponse<ExpressLikeResponse>();

    const headerValue = this.headerValue(request, 'idempotency-key');
    if (!headerValue) return next.handle();
    if (headerValue.length > 200) {
      throw new BadRequestException('Idempotency-Key must be ≤ 200 characters.');
    }

    const method = request.method ?? 'POST';
    const path = request.originalUrl ?? request.url ?? '/';
    const actorId = request.principal?.personId ?? request.principal?.userId ?? null;
    const requestHash = this.hashBody(request.body);
    const ttlSeconds = metadata.ttlSeconds ?? DEFAULT_TTL_SECONDS;

    return from(
      this.lookupAndDecide({
        idempotencyKey: headerValue,
        method,
        path,
        actorId,
        requestHash,
        ttlSeconds,
      }),
    ).pipe(
      switchMap((decision) => {
        if (decision.kind === 'replay') {
          if (response.setHeader) response.setHeader('Idempotent-Replay', 'true');
          if (response.statusCode !== undefined && decision.responseStatus !== null) {
            response.statusCode = decision.responseStatus;
          }
          return of(decision.responseBody);
        }
        if (decision.kind === 'reserve') {
          return next.handle().pipe(
            tap({
              next: async (body: unknown) => {
                await this.markCompleted(
                  decision.id,
                  response.statusCode ?? 200,
                  body,
                );
              },
            }),
            catchError((err: unknown) => {
              void this.markFailed(decision.id);
              throw err;
            }),
          );
        }
        // decision.kind === 'reject'
        throw decision.error;
      }),
      catchError((err: unknown) => {
        if (err instanceof ConflictException || err instanceof BadRequestException) {
          throw err;
        }
        // Any other failure during the lookup/reserve flow shouldn't
        // block the request — fall back to running the handler without
        // idempotency caching, so a Prisma blip can't take down writes.
        this.logger.warn(
          `Idempotency lookup failed for ${method} ${path}; bypassing cache. ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        return next.handle();
      }),
    );
  }

  private headerValue(request: ExpressLikeRequest, name: string): string | null {
    const raw = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw.trim() || null;
  }

  private hashBody(body: unknown): string {
    const serialized = JSON.stringify(body ?? null);
    return createHash('sha256').update(serialized).digest('hex');
  }

  // The atomic reserve-or-discover step. Tries to insert a PENDING
  // row; on unique-constraint conflict the existing row drives the
  // decision (replay COMPLETED, 409 PENDING, 409 hash mismatch).
  private async lookupAndDecide(args: {
    idempotencyKey: string;
    method: string;
    path: string;
    actorId: string | null;
    requestHash: string;
    ttlSeconds?: number;
  }): Promise<
    | { kind: 'replay'; responseStatus: number | null; responseBody: unknown }
    | { kind: 'reserve'; id: string }
    | { kind: 'reject'; error: Error }
  > {
    const ttlSeconds = args.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const existing = await this.prisma.idempotencyKey.findFirst({
      where: {
        idempotencyKey: args.idempotencyKey,
        method: args.method,
        path: args.path,
        actorId: args.actorId,
      },
    });

    if (existing && existing.expiresAt.getTime() > Date.now()) {
      // Hash-mismatch check only matters for non-FAILED rows: a FAILED
      // row produced no committed work, so the caller is free to retry
      // with a different body if they want.
      if (existing.status !== 'FAILED' && existing.requestHash !== args.requestHash) {
        return {
          kind: 'reject',
          error: new ConflictException(
            'Idempotency-Key reused with a different request body. Pick a fresh key or use the original payload.',
          ),
        };
      }
      if (existing.status === 'COMPLETED') {
        return {
          kind: 'replay',
          responseStatus: existing.responseStatus,
          responseBody: existing.responseBody,
        };
      }
      if (existing.status === 'PENDING') {
        return {
          kind: 'reject',
          error: new ConflictException(
            'A request with this Idempotency-Key is already in flight. Retry once the original completes.',
          ),
        };
      }
      // FAILED — caller may retry; fall through to insert a fresh
      // PENDING row. Update the existing row in-place to avoid the
      // unique-constraint collision.
      const renewed = await this.prisma.idempotencyKey.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          requestHash: args.requestHash,
          responseStatus: null,
          responseBody: Prisma.JsonNull,
          completedAt: null,
          expiresAt,
        },
      });
      return { kind: 'reserve', id: renewed.id };
    }

    if (existing && existing.expiresAt.getTime() <= Date.now()) {
      // Expired — repurpose the row.
      const renewed = await this.prisma.idempotencyKey.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          requestHash: args.requestHash,
          responseStatus: null,
          responseBody: Prisma.JsonNull,
          completedAt: null,
          expiresAt,
        },
      });
      return { kind: 'reserve', id: renewed.id };
    }

    // Fresh insert. The unique index on (key, method, path, actorId)
    // is the race-condition guard: two concurrent inserts with the
    // same tuple — one wins, the other catches P2002 below.
    try {
      const created = await this.prisma.idempotencyKey.create({
        data: {
          idempotencyKey: args.idempotencyKey,
          method: args.method,
          path: args.path,
          actorId: args.actorId,
          requestHash: args.requestHash,
          expiresAt,
        },
      });
      return { kind: 'reserve', id: created.id };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'P2002') {
        // Race lost. Re-fetch and treat as the existing-row branch.
        return this.lookupAndDecide(args);
      }
      throw error;
    }
  }

  private async markCompleted(
    id: string,
    status: number,
    body: unknown,
  ): Promise<void> {
    try {
      await this.prisma.idempotencyKey.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          responseStatus: status,
          responseBody: (body ?? null) as never,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to stamp idempotency row ${id} COMPLETED: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async markFailed(id: string): Promise<void> {
    try {
      await this.prisma.idempotencyKey.update({
        where: { id },
        data: { status: 'FAILED', completedAt: new Date() },
      });
    } catch {
      // best-effort.
    }
  }
}
