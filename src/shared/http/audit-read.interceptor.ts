import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';

import { AUDIT_READ_KEY, AuditReadMetadata } from './audit-read.decorator';

interface ExpressLikeRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  principal?: { personId?: string; userId?: string; roles?: string[] };
}

// HD-0.7 — pairs with `@AuditRead`. After a successful response, writes
// an `AuditLog` row capturing who read what and when. Failures
// (exceptions) are NOT audited as a successful read because the
// caller didn't actually receive the data — but the failure is
// already in `legacy_endpoint_call`-style structured logs for ops.
@Injectable()
export class AuditReadInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditRead');

  public constructor(
    private readonly reflector: Reflector,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditReadMetadata | undefined>(
      AUDIT_READ_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) return next.handle();

    const request = context.switchToHttp().getRequest<ExpressLikeRequest>();

    return next.handle().pipe(
      tap({
        next: () => {
          try {
            this.recordReadAudit(metadata, request);
          } catch (error) {
            // Audit must never block the response. Log + move on.
            this.logger.warn(
              `AuditRead recording failed for ${metadata.actionType}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        },
      }),
    );
  }

  private recordReadAudit(
    metadata: AuditReadMetadata,
    request: ExpressLikeRequest,
  ): void {
    const actorId =
      request.principal?.personId ?? request.principal?.userId ?? 'unknown';
    const targetEntityId = this.resolveTargetId(metadata, request);
    if (!targetEntityId) {
      // Don't write audit rows with null aggregate IDs — those are
      // unusable for forensic queries. Better to no-op and leave a
      // single warn line than to flood the table.
      this.logger.warn(
        `AuditRead skipped for ${metadata.actionType}: target id could not be resolved.`,
      );
      return;
    }

    this.auditLogger.record({
      actionType: metadata.actionType,
      actorId,
      category: metadata.category as never, // Trusted at decorator-write time.
      changeSummary:
        metadata.summary ??
        `${metadata.actionType} — actor ${actorId} read ${metadata.targetEntity.entityType} ${targetEntityId}.`,
      details: {
        path: request.originalUrl ?? request.url,
        method: request.method,
        targetEntityId,
      },
      metadata: {
        path: request.originalUrl ?? request.url,
      },
      targetEntityId,
      targetEntityType: metadata.targetEntity.entityType,
    });
  }

  private resolveTargetId(
    metadata: AuditReadMetadata,
    request: ExpressLikeRequest,
  ): string | null {
    const src = metadata.targetEntity.idFrom;
    if (src.kind === 'param') {
      const fromParam = request.params?.[src.name];
      const fromQuery = request.query?.[src.name];
      return fromParam ?? fromQuery ?? null;
    }
    if (src.kind === 'principal') {
      return request.principal?.personId ?? null;
    }
    if (src.kind === 'body') {
      const body = request.body ?? {};
      const value = src.path
        .split('.')
        .reduce<unknown>(
          (acc, key) =>
            acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
          body,
        );
      return typeof value === 'string' ? value : null;
    }
    return null;
  }
}
