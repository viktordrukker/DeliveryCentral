import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

import { PulseService } from '../application/pulse.service';
import { PulseEntryDto, PulseHistoryDto, SubmitPulseDto } from '../application/contracts/pulse.dto';

@ApiTags('pulse')
@Controller('pulse')
export class PulseController {
  public constructor(private readonly service: PulseService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit or update own weekly pulse' })
  @ApiOkResponse({ description: 'Pulse entry' })
  public async submit(
    @Body() dto: SubmitPulseDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<PulseEntryDto> {
    const personId = this.resolvePersonId(req);
    return this.service.submit(personId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get own pulse history' })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  @ApiOkResponse({ description: 'Pulse history' })
  public async getMyHistory(
    @Req() req: { principal?: RequestPrincipal },
    @Query('weeks') weeksStr?: string,
  ): Promise<PulseHistoryDto> {
    const personId = this.resolvePersonId(req);
    const weeks = weeksStr ? parseInt(weeksStr, 10) : 4;
    return this.service.getMyHistory(personId, weeks);
  }

  private resolvePersonId(req: { principal?: RequestPrincipal }): string {
    const id = req.principal?.personId ?? req.principal?.userId;
    if (!id) {
      throw new BadRequestException('Could not determine actor identity from request.');
    }
    return id;
  }
}
