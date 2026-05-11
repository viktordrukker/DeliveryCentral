import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import {
  PLATFORM_FLAGS,
  PlatformFlagsService,
} from '@src/shared/config/platform-flags.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { UpdateFeatureFlagDto } from './feature-flag.dto';

/**
 * Sprint F-1.1 — Tenant Settings Catalog admin surface.
 *
 * Renders the 88-flag registry with metadata so admins can see every
 * toggle-able feature in one place + flip per-tenant overrides without
 * touching the database. Backs the `/admin/feature-flags` FE page.
 *
 * The PATCH endpoint writes to the same `PlatformSetting` rows that
 * `PlatformFlagsService.isEnabledByKey()` reads from, then invalidates the
 * 30s cache so the change takes effect on the next request.
 */
@ApiTags('admin')
@Controller('admin/feature-flags')
export class FeatureFlagsAdminController {
  private readonly logger = new Logger(FeatureFlagsAdminController.name);

  public constructor(
    private readonly flags: PlatformFlagsService,
    private readonly prisma: PrismaService,
  ) {}

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
    return this.flags.listAll();
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
  ): Promise<{
    id: string;
    key: string;
    previousValue: boolean;
    currentValue: boolean;
  }> {
    const flag = (PLATFORM_FLAGS as Record<string, { key: string; default: boolean } | undefined>)[id];
    if (!flag) {
      throw new NotFoundException(`Unknown feature flag: ${id}`);
    }
    const previousValue = await this.flags.isEnabledByKey(flag.key, flag.default);
    await this.prisma.platformSetting.upsert({
      where: { key: flag.key },
      create: { key: flag.key, value: dto.value },
      update: { value: dto.value },
    });
    this.flags.invalidate();
    this.logger.log(
      `Feature flag '${id}' (${flag.key}) flipped ${previousValue} → ${dto.value}`,
    );
    return {
      id,
      key: flag.key,
      previousValue,
      currentValue: dto.value,
    };
  }
}
