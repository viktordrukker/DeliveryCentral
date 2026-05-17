import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import {
  DEFAULT_ROLE_PRESETS,
  ROLE_PRESET_NAMES,
  isRolePresetName,
  platformSettingKeyForPreset,
  type RolePresetName,
} from '@src/shared/auth/role-presets';
import { RolePresetsService } from '@src/shared/auth/role-presets.service';
import { isPlatformRole, type PlatformRole } from '@src/modules/identity-access/domain/platform-role';

import { SetRolePresetOverrideRequestDto } from '../application/contracts/set-role-preset-override.request';

interface PresetView {
  preset: RolePresetName;
  defaults: PlatformRole[];
  effective: PlatformRole[];
  overridden: boolean;
}

/**
 * F-5.2 / D-130 step 2 — admin CRUD for role-preset overrides.
 *
 * The override is stored at the `responsibilityMatrix.<preset>.roles`
 * PlatformSetting key. PUT with `{ roles: null }` clears the override
 * and falls back to the compile-time default. Always admin-only.
 */
@ApiTags('admin/role-presets')
@Controller('admin/role-presets')
export class RolePresetsAdminController {
  public constructor(
    private readonly settings: PlatformSettingsService,
    private readonly rolePresets: RolePresetsService,
  ) {}

  @Get()
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List every role preset with its default + effective role set.' })
  @ApiOkResponse({ description: 'Array of presets.' })
  public async list(): Promise<PresetView[]> {
    const out: PresetView[] = [];
    for (const name of ROLE_PRESET_NAMES) {
      out.push(await this.view(name));
    }
    return out;
  }

  @Get(':preset')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Read a single role preset.' })
  @ApiOkResponse({ description: 'Preset detail.' })
  public async getOne(@Param('preset') preset: string): Promise<PresetView> {
    return this.view(this.parsePreset(preset));
  }

  @Put(':preset')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Override the role list for a preset; pass `roles: null` to clear the override.',
  })
  @ApiOkResponse({ description: 'Updated preset detail.' })
  public async setOverride(
    @Param('preset') presetParam: string,
    @Body() body: SetRolePresetOverrideRequestDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<PresetView> {
    const preset = this.parsePreset(presetParam);
    const actorId = req.principal?.personId ?? req.principal?.userId ?? null;
    const key = platformSettingKeyForPreset(preset);

    if (body.roles === null) {
      await this.settings.updateKey(key, null, actorId ?? undefined);
      this.rolePresets.invalidate();
      return this.view(preset);
    }

    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      throw new BadRequestException(
        'roles must be a non-empty array of PlatformRole values, or null to clear.',
      );
    }
    for (const role of body.roles) {
      if (typeof role !== 'string' || !isPlatformRole(role)) {
        throw new BadRequestException(`Invalid PlatformRole: ${JSON.stringify(role)}.`);
      }
    }

    const dedup = Array.from(new Set(body.roles)) as PlatformRole[];
    if (!dedup.includes('admin')) {
      throw new BadRequestException(
        'admin must be present in every preset override (no implicit grants).',
      );
    }

    await this.settings.updateKey(key, dedup, actorId ?? undefined);
    this.rolePresets.invalidate();
    return this.view(preset);
  }

  private parsePreset(value: string): RolePresetName {
    if (!isRolePresetName(value)) {
      throw new BadRequestException(
        `Unknown preset "${value}". Known: ${ROLE_PRESET_NAMES.join(', ')}.`,
      );
    }
    return value;
  }

  private async view(preset: RolePresetName): Promise<PresetView> {
    const defaults = [...DEFAULT_ROLE_PRESETS[preset]];
    const effective = await this.rolePresets.resolve(preset);
    const overridden = !arraysEqual(defaults, effective);
    return { preset, defaults, effective, overridden };
  }
}

function arraysEqual(a: PlatformRole[], b: PlatformRole[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const item of b) if (!setA.has(item)) return false;
  return true;
}
