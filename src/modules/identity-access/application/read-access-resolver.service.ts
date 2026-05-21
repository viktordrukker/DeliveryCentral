import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import { isPlatformRole, type PlatformRole } from '../domain/platform-role';

import type { ReadActionKind } from './responsibility-resolver.service';

/**
 * F-5.3 / D-158 — read-access resolver.
 *
 * Reads `responsibility_rules` rows whose `actionKind` is one of the
 * READ_* kinds and returns the effective role list per tenant policy.
 * The convention for READ_* rules:
 *   - `mode = 'ROLE'`, `targetRole = '<role>'` → grant access to that role
 *   - Multiple rules for the same actionKind = union of all `targetRole`s
 *   - Empty result → no tenant policy; caller should fall through to the
 *     static @RequireRoles set
 *
 * The decision is purely a function of `(role, action)` plus the
 * current `responsibility_rules` state — no clock, no random, no
 * principal-PII inputs. The companion unit test exercises this
 * purity guarantee to satisfy the Phase 11 R-03 determinism gate.
 */

export interface ReadAccessVerdict {
  /** When false, no tenant policy is set — caller should fall through. */
  hasTenantPolicy: boolean;
  /** Effective allowed roles after applying tenant policy. */
  allowedRoles: readonly PlatformRole[];
}

// F-57 / 20c-11 — derive `RuleRow` from Prisma instead of hand-rolling
// the subset of `ResponsibilityRule` fields used downstream. Same shape
// as F-47's responsibility-resolver pattern.
type RuleRow = Prisma.ResponsibilityRuleGetPayload<Record<string, never>>;

@Injectable()
export class ReadAccessResolverService {
  private readonly logger = new Logger(ReadAccessResolverService.name);

  public constructor(private readonly prisma: PrismaService) {}

  public async resolveAllowedRoles(
    action: ReadActionKind,
    tenantId: string | null = null,
  ): Promise<ReadAccessVerdict> {
    let rows: RuleRow[] = [];
    try {
      rows = await this.prisma.responsibilityRule.findMany({
        where: {
          actionKind: action as never,
          isActive: true,
          archivedAt: null,
          ...(tenantId === null
            ? { tenantId: null }
            : { OR: [{ tenantId: null }, { tenantId }] }),
        },
      });
    } catch (error) {
      this.logger.warn(
        `ReadAccessResolverService.resolveAllowedRoles(${action}) failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { hasTenantPolicy: false, allowedRoles: [] };
    }

    if (rows.length === 0) {
      return { hasTenantPolicy: false, allowedRoles: [] };
    }

    const allowed = new Set<PlatformRole>();
    for (const row of rows) {
      if (row.mode !== 'ROLE') continue;
      if (!row.targetRole) continue;
      if (!isPlatformRole(row.targetRole)) continue;
      allowed.add(row.targetRole);
    }
    return { hasTenantPolicy: true, allowedRoles: Array.from(allowed) };
  }

  /**
   * Pure-function helper: given the resolver verdict + caller's roles,
   * return whether the caller is permitted. Exposed so unit tests can
   * verify the (role, action) → boolean shape without DB.
   */
  public static permits(verdict: ReadAccessVerdict, callerRoles: readonly string[]): boolean {
    if (!verdict.hasTenantPolicy) return false;
    return verdict.allowedRoles.some((r) => callerRoles.includes(r));
  }
}
