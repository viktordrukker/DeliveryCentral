import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { registerPublicIdMiddleware } from './public-id-prisma.middleware';
import { PublicIdService } from './public-id.service';

/**
 * Installs the publicId-generation Prisma middleware at application startup.
 *
 * The hookup is gated by the `PUBLIC_ID_MIDDLEWARE_ENABLED` env var (default
 * `"true"`). Operators who need to disable the middleware — for example during
 * the transition window where an aggregate's DM-2 expand migration is not yet
 * applied in production — set `PUBLIC_ID_MIDDLEWARE_ENABLED=false` to skip the
 * install. When the middleware is off every `create` / `createMany` on the
 * tables in `MODEL_TO_AGGREGATE_TYPE` relies on the BEFORE-INSERT-OR-UPDATE
 * trigger installed by the expand migration as the publicId source.
 *
 * Implementation choice: this is a separate bootstrap service rather than
 * constructor injection on `PrismaService`, so the persistence module stays
 * free of public-id concerns. We resolve `PrismaService` lazily via
 * {@link ModuleRef} inside `onModuleInit` — constructor injection across
 * module boundaries was unreliable in the PublicIdModule scope (even with
 * `PrismaModule` declared `@Global()`) and was causing `Nest can't resolve
 * dependencies of PublicIdBootstrapService(?, PublicIdService)` at startup.
 * `ModuleRef.get(..., { strict: false })` walks the global provider registry,
 * which is populated by the time `onModuleInit` fires, sidestepping the DI
 * visibility issue without re-introducing a PrismaModule↔PublicIdModule cycle.
 */
@Injectable()
export class PublicIdBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(PublicIdBootstrapService.name);

  public constructor(
    private readonly moduleRef: ModuleRef,
    private readonly publicIdService: PublicIdService,
  ) {}

  public onModuleInit(): void {
    const enabled = (process.env.PUBLIC_ID_MIDDLEWARE_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) {
      this.logger.warn(
        'PUBLIC_ID_MIDDLEWARE_ENABLED=false — skipping Prisma publicId middleware install. ' +
          'New rows on DM-2 tables will rely on the database trigger for publicId.',
      );
      return;
    }
    const prisma = this.moduleRef.get(PrismaService, { strict: false });
    if (!prisma) {
      this.logger.error(
        'PrismaService not resolvable via ModuleRef — publicId middleware NOT installed. ' +
          'This indicates a broader module-graph issue. New rows will rely on the DB trigger.',
      );
      return;
    }
    registerPublicIdMiddleware(prisma, this.publicIdService);
    this.logger.log('Prisma publicId middleware installed (DM-2.5-3 / DMD-026).');
  }
}
