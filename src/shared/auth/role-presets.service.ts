import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import { isPlatformRole, type PlatformRole } from '@src/modules/identity-access/domain/platform-role';

import {
  DEFAULT_ROLE_PRESETS,
  ROLE_PRESET_NAMES,
  isRolePresetName,
  platformSettingKeyForPreset,
  type RolePresetName,
} from './role-presets';

/**
 * F-5.2 / D-130 step 2 — resolves a role-preset name (e.g. `EXEC_ROLES`)
 * to its currently effective role list. The default is the compile-time
 * constant in `role-presets.ts`; a tenant admin can override it by
 * writing a `responsibilityMatrix.<name>.roles` PlatformSetting.
 *
 * Cache is in-memory + invalidated on admin write (see
 * `setOverride()`/`clearOverride()` which delegate to PlatformSettings
 * and then flush). At single-tenant scale that's safe; a SaaS multi-
 * instance pivot would replace this with a pub/sub channel.
 */
@Injectable()
export class RolePresetsService {
  private readonly logger = new Logger(RolePresetsService.name);
  private cache: Map<RolePresetName, PlatformRole[]> | null = null;

  public constructor(private readonly prisma: PrismaService) {}

  public async resolve(preset: RolePresetName): Promise<PlatformRole[]> {
    if (!this.cache) await this.rebuildCache();
    const live = this.cache!.get(preset);
    if (live) return [...live];
    return [...DEFAULT_ROLE_PRESETS[preset]];
  }

  public async resolveAll(): Promise<Record<RolePresetName, PlatformRole[]>> {
    if (!this.cache) await this.rebuildCache();
    const out: Partial<Record<RolePresetName, PlatformRole[]>> = {};
    for (const name of ROLE_PRESET_NAMES) {
      out[name] = await this.resolve(name);
    }
    return out as Record<RolePresetName, PlatformRole[]>;
  }

  public defaultsFor(preset: RolePresetName): PlatformRole[] {
    return [...DEFAULT_ROLE_PRESETS[preset]];
  }

  public invalidate(): void {
    this.cache = null;
  }

  private async rebuildCache(): Promise<void> {
    const next = new Map<RolePresetName, PlatformRole[]>();
    try {
      const rows = await this.prisma.platformSetting.findMany({
        where: { key: { startsWith: 'responsibilityMatrix.' } },
      });
      for (const row of rows) {
        const presetName = this.parsePresetName(row.key);
        if (!presetName) continue;
        const parsed = this.parseRoleList(row.value);
        if (!parsed) continue;
        next.set(presetName, parsed);
      }
    } catch (error) {
      this.logger.warn(
        `RolePresetsService cache rebuild failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    this.cache = next;
  }

  private parsePresetName(key: string): RolePresetName | null {
    const tail = key.replace(/^responsibilityMatrix\./, '').replace(/\.roles$/, '');
    return isRolePresetName(tail) ? tail : null;
  }

  private parseRoleList(value: unknown): PlatformRole[] | null {
    if (!Array.isArray(value)) return null;
    if (value.length === 0) return null;
    const out: PlatformRole[] = [];
    for (const item of value) {
      if (typeof item !== 'string') return null;
      if (!isPlatformRole(item)) return null;
      out.push(item);
    }
    return out;
  }
}

// Re-export PlatformSetting key helper so callers don't double-import.
export { platformSettingKeyForPreset };
