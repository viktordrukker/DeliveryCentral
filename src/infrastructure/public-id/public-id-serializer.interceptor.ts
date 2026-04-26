import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

import {
  DEFAULT_PUBLIC_ID_SERIALIZER_CONFIG,
  PUBLIC_ID_SERIALIZER_CONFIG,
  PublicIdSerializerConfig,
} from './public-id-serializer.config';
import { PublicIdService } from './public-id.service';

/**
 * Runtime egress guardrail for DMD-026 (UUIDs never leave the API boundary).
 *
 * Does three things per response body:
 *
 * 1. Swaps each object's `id` field with the sibling `publicId` — so callers
 *    see `{ id: "prj_..." }` regardless of the shape services internally use.
 * 2. Rewrites every foreign-key field `<name>Id` to the sibling `<name>PublicId`
 *    when present. Drops the loose `<name>PublicId` field afterwards.
 * 3. After the rewrite, scans the resulting body for any residual uuid-shaped
 *    string. Behaviour is governed by `PublicIdSerializerConfig.strict`:
 *    `true` throws (catches leaks in CI / tests), `false` logs (production-safe
 *    default while the DM-2.5 rollout is still in progress).
 *
 * The interceptor is deliberately passive about fields it does not recognise.
 * It's a backstop for the static `controller-uuid-leak` lint (DM-2.5-7) and
 * for repositories that already return both `id` and `publicId`.
 */
@Injectable()
export class PublicIdSerializerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PublicIdSerializerInterceptor.name);
  private readonly config: PublicIdSerializerConfig;

  public constructor(
    private readonly publicIdService: PublicIdService,
    @Optional() @Inject(PUBLIC_ID_SERIALIZER_CONFIG) config?: PublicIdSerializerConfig,
  ) {
    this.config = config ?? DEFAULT_PUBLIC_ID_SERIALIZER_CONFIG;
  }

  public intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.config.enabled) {
      // Short-circuit — the rollout-safe default. See PublicIdSerializerConfig.enabled.
      return next.handle();
    }
    return next.handle().pipe(map((body) => this.rewrite(body, [])));
  }

  private rewrite(value: unknown, pathSegments: string[]): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      this.assertNoUuidLeak(value, pathSegments);
      return value;
    }
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        this.rewrite(item, [...pathSegments, String(index)]),
      );
    }
    return this.rewriteObject(value as Record<string, unknown>, pathSegments);
  }

  private rewriteObject(obj: Record<string, unknown>, pathSegments: string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    const hasPublicIdCompanion =
      typeof obj.publicId === 'string' && obj.publicId.length > 0;

    for (const [key, rawValue] of Object.entries(obj)) {
      // Drop loose `publicId` / `<name>PublicId` — they have been merged into id/<name>Id.
      if (key === 'publicId') continue;
      if (/PublicId$/.test(key)) continue;

      // Rule 1: id becomes the publicId on the same object.
      if (key === 'id' && hasPublicIdCompanion) {
        out.id = obj.publicId;
        continue;
      }

      // Rule 2: <foreign>Id → sibling <foreign>PublicId when present.
      const fkMatch = /^(.+)Id$/.exec(key);
      if (fkMatch && key !== 'id') {
        const companionKey = `${fkMatch[1]}PublicId`;
        const companionValue = obj[companionKey];
        if (typeof companionValue === 'string' && companionValue.length > 0) {
          out[key] = companionValue;
          continue;
        }
      }

      out[key] = this.rewrite(rawValue, [...pathSegments, key]);
    }

    return out;
  }

  private assertNoUuidLeak(value: string, pathSegments: string[]): void {
    if (!this.publicIdService.looksLikeUuid(value)) return;
    const path = pathSegments.length === 0 ? '<root>' : pathSegments.join('.');
    const message = `UUID leak detected on response path "${path}": ${value}. ` +
      'Every user-facing identifier must be a publicId (DMD-026, schema-conventions §20).';
    if (this.config.strict) {
      throw new Error(message);
    }
    // Warn, not error: each unmigrated aggregate surfaces many of these and a
    // steady stream of ERROR-level logs drowns real failures. Strict-mode CI
    // turns them into exceptions so the volume never becomes normalised.
    this.logger.warn(message);
  }
}
