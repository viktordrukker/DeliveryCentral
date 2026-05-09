import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

const FLAG_CACHE_TTL_MS = 30_000;

interface CacheEntry {
  value: boolean;
  cachedAt: number;
}

// HD-12 — single registry of known flag keys. New flags go here so the
// codebase has one grep target for "what feature flags exist". The
// registry is data-only (no behavior); the runtime checks happen via
// `PlatformFlagsService.isEnabled(...)`.
//
// The `default` is what `isEnabled` returns when the row is absent OR
// the lookup throws (DB unavailable in early boot, missing table, etc.)
// — the call site MUST be safe for the fallback value.
export const PLATFORM_FLAGS = {
  outboxEnabled: {
    key: 'flag.outboxEnabled',
    description:
      'Master switch for the OutboxEvent dual-write seam. When true, NotificationEventTranslatorService writes outbox rows + the publisher dispatches; when false (default), the translator runs synchronously.',
    default: false,
  },
} as const satisfies Record<string, { key: string; description: string; default: boolean }>;

export type PlatformFlagId = keyof typeof PLATFORM_FLAGS;

@Injectable()
export class PlatformFlagsService {
  private readonly logger = new Logger(PlatformFlagsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  public constructor(private readonly prisma?: PrismaService) {}

  public async isEnabled(flagId: PlatformFlagId): Promise<boolean> {
    const flag = PLATFORM_FLAGS[flagId];
    return this.isEnabledByKey(flag.key, flag.default);
  }

  public async isEnabledByKey(key: string, fallback: boolean): Promise<boolean> {
    if (!this.prisma) return fallback;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && now - hit.cachedAt < FLAG_CACHE_TTL_MS) return hit.value;

    let value = fallback;
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key } });
      const raw = row?.value;
      if (typeof raw === 'boolean') value = raw;
      else if (typeof raw === 'string') value = raw === 'true';
      else value = fallback;
    } catch (error) {
      this.logger.debug(
        `PlatformFlag lookup for ${key} failed; using fallback ${fallback}. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      value = fallback;
    }

    this.cache.set(key, { value, cachedAt: now });
    return value;
  }

  /** Test/admin escape hatch: clear the cache so the next read hits the DB. */
  public invalidate(): void {
    this.cache.clear();
  }
}
