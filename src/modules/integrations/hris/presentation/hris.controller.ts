import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { UpdateHrisConfigRequestDto } from '../application/contracts/update-hris-config.request';
import {
  HrisConfig,
  HrisSyncResult,
  HrisSyncService,
  HrisTestConnectionResult,
} from '../application/hris-sync.service';
import { HrisTestConnectionResponseDto } from '../contracts/hris-test-connection-response.contract';

@ApiTags('hris')
@Controller('admin/hris')
export class HrisController {
  public constructor(private readonly hrisSyncService: HrisSyncService) {}

  @Get('config')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Get HRIS integration configuration' })
  @ApiOkResponse({ description: 'HRIS config.' })
  public getConfig(): HrisConfig {
    return this.hrisSyncService.getConfig();
  }

  @Post('config')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Update HRIS integration configuration' })
  @ApiOkResponse({ description: 'Updated HRIS config.' })
  public updateConfig(@Body() body: UpdateHrisConfigRequestDto): HrisConfig {
    // HrisSyncService.updateConfig deep-merges into a default-populated
    // config; the DTO's nested-optional shape is intentionally looser
    // than `Partial<HrisConfig>` so admins can patch a subset of fields
    // without supplying the full nested object.
    return this.hrisSyncService.updateConfig(body as Partial<HrisConfig>);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Trigger HRIS sync manually' })
  @ApiOkResponse({ description: 'Sync result.' })
  public async runSync(): Promise<HrisSyncResult> {
    return this.hrisSyncService.runSync();
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'Probe the HRIS adapter reachability without mutating internal employees — returns latency and any error.',
  })
  @ApiOkResponse({
    type: HrisTestConnectionResponseDto,
    description: 'HRIS connection probe result.',
  })
  public async testConnection(): Promise<HrisTestConnectionResult> {
    return this.hrisSyncService.testConnection();
  }
}
