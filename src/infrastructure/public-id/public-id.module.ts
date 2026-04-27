import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { PublicIdBootstrapService } from './public-id-bootstrap.service';
import {
  PUBLIC_ID_SERIALIZER_CONFIG,
  PublicIdSerializerConfig,
} from './public-id-serializer.config';
import { PublicIdSerializerInterceptor } from './public-id-serializer.interceptor';
import { PublicIdService } from './public-id.service';

/**
 * Global module wiring the DM-2.5 public-ID layer:
 *
 *   - exports {@link PublicIdService} for controllers/services/tests
 *   - registers {@link PublicIdSerializerInterceptor} as `APP_INTERCEPTOR`
 *     (global egress guardrail, rewrite + leak detection)
 *   - runs {@link PublicIdBootstrapService} on module init to install the
 *     Prisma `create` / `createMany` publicId middleware
 *
 * The interceptor is off by default during the DM-2.5 rollout — it runs only
 * when `PUBLIC_ID_INTERCEPTOR_ENABLED=true`. This keeps the logs clean on
 * every environment that hasn't yet migrated all aggregates to publicId,
 * because the interceptor would otherwise scan every unmigrated response
 * and emit one log per leak. Strictness of an enabled interceptor is
 * governed separately by `PUBLIC_ID_STRICT=true` — CI jobs opt into both.
 * Tests that need strict behaviour inject the interceptor directly with
 * `{ enabled: true, strict: true }` config.
 */
function resolveSerializerConfig(): PublicIdSerializerConfig {
  const envFlag = (name: string) => (process.env[name] ?? '').toLowerCase() === 'true';
  return {
    enabled: envFlag('PUBLIC_ID_INTERCEPTOR_ENABLED'),
    strict: envFlag('PUBLIC_ID_STRICT'),
  };
}

@Global()
@Module({
  providers: [
    PublicIdService,
    PublicIdBootstrapService,
    {
      provide: PUBLIC_ID_SERIALIZER_CONFIG,
      useFactory: resolveSerializerConfig,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PublicIdSerializerInterceptor,
    },
  ],
  exports: [PublicIdService],
})
export class PublicIdModule {}
