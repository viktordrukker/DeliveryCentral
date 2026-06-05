import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { FeatureFlagAdminService } from './application/feature-flag-admin.service';
import { UpdateFeatureFlagDto } from './feature-flag.dto';

/**
 * Sprint F-1.1 — Tenant Settings Catalog admin surface.
 *
 * Renders the 88-flag registry with metadata so admins can see every
 * toggle-able feature in one place + flip per-tenant overrides without
 * touching the database. Backs the `/admin/feature-flags` FE page and the
 * `/admin?tab=feature-flags` inline mount (LEAN-P4d-1).
 *
 * The PATCH endpoint writes to the same `PlatformSetting` rows that
 * `PlatformFlagsService.isEnabledByKey()` reads from, then invalidates the
 * 30s cache so the change takes effect on the next request.
 *
 * LEAN-P4d-2 — accepts BOTH `{ value }` (legacy) and `{ enabled }`
 * (toggle UI) request bodies for back-compat.
 */
@ApiTags('admin')
@Controller('admin/feature-flags')
export class FeatureFlagsAdminController {
  public constructor(private readonly service: FeatureFlagAdminService) {}

  @Get()
  @RequireRoles('admin')
  @ApiOperation({
    summary: 'List all registered feature flags with metadata + current resolved value',
  })
  @ApiOkResponse({
    description: 'Array of flag definitions enriched with currentValue.',
  })
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
    return this.service.list();
  }

  @Patch(':id')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set the boolean value of a single feature flag' })
  @ApiOkResponse({
    description: 'Updated flag with resolved currentValue + previousValue.',
  })
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateFeatureFlagDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<{
    id: string;
    key: string;
    previousValue: boolean;
    currentValue: boolean;
  }> {
    const next = dto.enabled ?? dto.value;
    if (typeof next !== 'boolean') {
      throw new BadRequestException(
        'Request body must include either { value: boolean } or { enabled: boolean }.',
      );
    }
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? null;
    return this.service.toggle(id, next, actorId);
  }
}
