import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';

/**
 * ROLLBACK-DRILL — internal-only resolved-flag probe.
 *
 * Exposes the *currently effective* value of a single PlatformSetting key
 * (DB row if one exists, otherwise the compile-time default) so the
 * rollback-drill harness can poll for propagation after flipping a flag
 * via PATCH /api/admin/platform-settings/:key.
 *
 * NOT used by application code. Admin-only and surfaced at a deliberately
 * `_internal`-prefixed path so it never accidentally shows up in user-facing
 * docs. Read-only — no writes, no side effects.
 */
@ApiTags('admin/_internal')
@Controller('_internal/runtime-flags')
export class RuntimeFlagDebugController {
  public constructor(private readonly settings: PlatformSettingsService) {}

  @Get()
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'Resolve a PlatformSetting key (DB value, else default). Used by the rollback-drill harness to verify propagation.',
  })
  @ApiOkResponse({
    description: 'Resolved value snapshot.',
  })
  public async getFlag(
    @Query('key') key?: string,
  ): Promise<{ key: string; value: unknown; cachedAt: string }> {
    if (!key || typeof key !== 'string' || key.length === 0) {
      throw new BadRequestException('Query parameter "key" is required.');
    }

    const value = await this.settings.getRawValue(key);

    return {
      key,
      value,
      cachedAt: new Date().toISOString(),
    };
  }
}
