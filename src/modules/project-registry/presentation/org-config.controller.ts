import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { UpdateOrgConfigDto } from '../application/contracts/org-config.dto';
import { OrgConfigService } from '../application/org-config.service';

@ApiTags('organization-config')
@Controller('admin/organization-config')
export class OrgConfigController {
  public constructor(private readonly orgConfigService: OrgConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get the single-row organization configuration.' })
  @ApiOkResponse({ description: 'OrgConfigDto.' })
  @RequireRoles('admin')
  public async getConfig() {
    return this.orgConfigService.getConfig();
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update organization configuration (admin-only).' })
  @ApiOkResponse({ description: 'Updated OrgConfigDto.' })
  @RequireRoles('admin')
  public async updateConfig(
    @Body() patch: UpdateOrgConfigDto,
    @Req() httpRequest: { principal?: { personId?: string } },
  ) {
    return this.orgConfigService.updateConfig(patch, httpRequest.principal?.personId ?? null);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset organization configuration to product defaults.' })
  @ApiOkResponse({ description: 'OrgConfigDto after reset.' })
  @RequireRoles('admin')
  public async resetDefaults(@Req() httpRequest: { principal?: { personId?: string } }) {
    return this.orgConfigService.resetDefaults(httpRequest.principal?.personId ?? null);
  }
}
