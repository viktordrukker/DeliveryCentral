import type { Prisma } from '@prisma/client';

import { MODEL_TO_AGGREGATE_TYPE } from './aggregate-type';
import { PublicIdService } from './public-id.service';

/**
 * Prisma middleware that populates the `publicId` column on every `create` /
 * `createMany` for aggregate roots listed in MODEL_TO_AGGREGATE_TYPE.
 *
 * This is the production path — the expand-migration triggers remain in place
 * as a safety net for rows that somehow bypass the middleware (raw SQL, direct
 * DB access). Per DMD-026 the middleware is the authoritative generator once
 * DM-2.5 lands in release N+1.
 *
 * We use the legacy `$use` middleware API rather than `Prisma.defineExtension`
 * because the current `PrismaService` composes via inheritance (`extends
 * PrismaClient`) and `$extends` returns a composed type, not the same instance.
 * DM-2.5's later sub-phases can migrate to `$extends` once `PrismaService` is
 * refactored; the semantics for our narrow use case are equivalent.
 *
 * Collision handling: on a `P2002` unique-constraint violation on the
 * `publicId` column, regenerate and retry up to MAX_RETRIES. 48 bits of
 * entropy makes this effectively cosmetic.
 */
const MAX_RETRIES = 3;
const UNIQUE_VIOLATION_CODE = 'P2002';

export function registerPublicIdMiddleware(
  prisma: { $use: (middleware: Prisma.Middleware) => void },
  publicIdService: PublicIdService,
): void {
  const middleware: Prisma.Middleware = async (params, next) => {
    const aggType = params.model ? MODEL_TO_AGGREGATE_TYPE[params.model] : undefined;
    if (!aggType) {
      return next(params);
    }

    if (params.action === 'create') {
      return runWithPublicIdRetry(
        () => {
          const args = params.args as { data?: Record<string, unknown> } | undefined;
          if (args?.data && args.data.publicId === undefined) {
            args.data.publicId = publicIdService.generate(aggType);
          }
          return next(params);
        },
        () => {
          const args = params.args as { data?: Record<string, unknown> } | undefined;
          if (args?.data) {
            args.data.publicId = publicIdService.generate(aggType);
          }
        },
      );
    }

    if (params.action === 'createMany') {
      const args = params.args as { data?: Record<string, unknown> | Record<string, unknown>[] } | undefined;
      const rows = Array.isArray(args?.data) ? args!.data : args?.data ? [args.data] : [];
      for (const row of rows) {
        if (row.publicId === undefined) {
          row.publicId = publicIdService.generate(aggType);
        }
      }
      // createMany collisions: regenerate ALL rows on retry — cheap and simple.
      return runWithPublicIdRetry(
        () => next(params),
        () => {
          for (const row of rows) {
            row.publicId = publicIdService.generate(aggType);
          }
        },
      );
    }

    return next(params);
  };

  prisma.$use(middleware);
}

async function runWithPublicIdRetry<T>(
  run: () => Promise<T>,
  regenerate: () => void,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isPublicIdUniqueViolation(error)) {
        throw error;
      }
      regenerate();
    }
  }
  throw lastError;
}

function isPublicIdUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; meta?: { target?: unknown } };
  if (candidate.code !== UNIQUE_VIOLATION_CODE) return false;
  const target = candidate.meta?.target;
  if (Array.isArray(target)) {
    return target.some((column) => typeof column === 'string' && column.toLowerCase() === 'publicid');
  }
  if (typeof target === 'string') {
    return target.toLowerCase().includes('publicid');
  }
  return false;
}
