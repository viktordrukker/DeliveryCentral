import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import {
  PLATFORM_FLAGS,
  PlatformFlagsService,
} from '@src/shared/config/platform-flags.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * W4-07 — Flags whose rollout is owned by a separate (staged) path and
 * must NEVER be flipped from the admin surface. The /admin/feature-flags
 * UI also renders these as "Rollout-locked" chips; this BE list enforces
 * the rule server-side so a direct PATCH to /api/admin/feature-flags/:id
 * cannot bypass the controlled v2 rollout.
 */
export const ROLLOUT_LOCKED_FLAGS: ReadonlySet<string> = new Set<string>([
  'dsRefresh',
  'workspaceMe',
]);

/**
 * LEAN-P4d-2 — extracted from the inline controller body so the
 * toggle/list logic is unit-testable without spinning up Nest.
 *
 * Owns the read/write path for the 88-flag PlatformSetting registry. The
 * controller stays thin: it adapts HTTP + RBAC, this service handles the
 * domain rules.
 */
@Injectable()
export class FeatureFlagAdminService {
  private readonly logger = new Logger(FeatureFlagAdminService.name);

  public constructor(
    private readonly flags: PlatformFlagsService,
    private readonly prisma: PrismaService,
  ) {}

  public async list(): Promise<
    Array<{
      id: string;
      key: string;
      description: string;
      category: string;
      maturityLevel: string;
      expectedGaSprint?: string;
      owner: string;
      dependsOn?: string[];
      default: boolean;
      currentValue: boolean;
    }>
  > {
    return this.flags.listAll();
  }

  public async toggle(
    id: string,
    next: boolean,
    actorId: string | null,
  ): Promise<{
    id: string;
    key: string;
    previousValue: boolean;
    currentValue: boolean;
  }> {
    const flag = (
      PLATFORM_FLAGS as Record<string, { key: string; default: boolean } | undefined>
    )[id];
    if (!flag) {
      throw new NotFoundException(`Unknown feature flag: ${id}`);
    }
    if (ROLLOUT_LOCKED_FLAGS.has(id)) {
      throw new ForbiddenException(
        `Feature flag '${id}' is rollout-locked and cannot be toggled from the admin surface.`,
      );
    }
    const previousValue = await this.flags.isEnabledByKey(flag.key, flag.default);
    // D-103-write-path — stamp actorId on every flip so the
    // PlatformSetting audit trail is complete.
    await this.prisma.platformSetting.upsert({
      where: { key: flag.key },
      create: {
        key: flag.key,
        value: next,
        createdByPersonId: actorId,
        updatedByPersonId: actorId,
      },
      update: { value: next, updatedByPersonId: actorId },
    });
    this.flags.invalidate();
    this.logger.log(
      `Feature flag '${id}' (${flag.key}) flipped ${previousValue} → ${next} by ${actorId ?? 'unknown actor'}`,
    );
    return {
      id,
      key: flag.key,
      previousValue,
      currentValue: next,
    };
  }
}
