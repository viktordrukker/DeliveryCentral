import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ThresholdUpsertDto } from '../application/contracts/threshold-upsert.dto';
import { RadiatorThresholdService } from '../application/radiator-threshold.service';

@ApiTags('admin-radiator-thresholds')
@Controller('admin/radiator-thresholds')
export class RadiatorThresholdController {
  public constructor(private readonly service: RadiatorThresholdService) {}

  @Get()
  @ApiOperation({ summary: 'List radiator threshold configs' })
  @ApiOkResponse({ description: 'All threshold configs (defaults + overrides).' })
  @RequireRoles('admin')
  public async list() {
    return this.service.listConfigs();
  }

  @Put(':subDimensionKey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert a radiator threshold config' })
  @ApiOkResponse({ description: 'Threshold upserted.' })
  @RequireRoles('admin')
  public async upsert(
    @Param('subDimensionKey') key: string,
    @Body() dto: ThresholdUpsertDto,
    @Req() httpRequest: { principal?: { personId?: string } },
  ) {
    const actorId = httpRequest.principal?.personId ?? 'unknown';
    await this.service.upsertConfig(
      key,
      {
        t4: dto.thresholdScore4,
        t3: dto.thresholdScore3,
        t2: dto.thresholdScore2,
        t1: dto.thresholdScore1,
        direction: dto.direction,
      },
      actorId,
    );
    return { ok: true };
  }
}
