import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { HrisConfig, HrisSyncResult, HrisSyncService } from '../application/hris-sync.service';

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
  public updateConfig(@Body() body: Partial<HrisConfig>): HrisConfig {
    return this.hrisSyncService.updateConfig(body);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Trigger HRIS sync manually' })
  @ApiOkResponse({ description: 'Sync result.' })
  public async runSync(): Promise<HrisSyncResult> {
    return this.hrisSyncService.runSync();
  }
}
