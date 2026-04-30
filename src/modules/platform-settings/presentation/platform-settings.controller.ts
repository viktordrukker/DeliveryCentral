import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Request,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { PlatformSettingsService } from '../application/platform-settings.service';
import {
  SettingsResponseDto,
  UpdateSettingDto,
  UpdateSettingResponseDto,
} from '../application/contracts/platform-settings.dto';

interface AuthenticatedRequest {
  user?: { personId?: string; sub?: string };
}

@ApiTags('admin')
@Controller('admin/platform-settings')
export class PlatformSettingsController {
  public constructor(private readonly service: PlatformSettingsService) {}

  @Get()
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Get all platform settings grouped by section' })
  @ApiOkResponse({ type: SettingsResponseDto })
  public async getAll(): Promise<SettingsResponseDto> {
    return this.service.getAll();
  }

  @Get('by-prefix/:prefix')
  @RequireRoles('admin')
  @ApiOperation({
    summary: 'List platform-setting rows under a key prefix (e.g. "assignment.").',
  })
  public async getByPrefix(
    @Param('prefix') prefix: string,
  ): Promise<{ key: string; value: unknown; isDefault: boolean }[]> {
    return this.service.getByPrefix(prefix);
  }

  @Patch(':key')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a single platform setting key' })
  @ApiOkResponse({ type: UpdateSettingResponseDto })
  public async updateKey(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<UpdateSettingResponseDto> {
    const actorId = req.user?.personId ?? req.user?.sub;
    return this.service.updateKey(key, dto.value, actorId);
  }
}
