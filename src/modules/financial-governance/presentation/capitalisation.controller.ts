import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

import { FinancialService } from '../application/financial.service';
import {
  CapitalisationReport,
  CreatePeriodLockDto,
  PeriodLockDto,
} from '../application/contracts/financial.dto';

const REPORT_ROLES = [
  'project_manager',
  'resource_manager',
  'hr_manager',
  'delivery_manager',
  'director',
  'admin',
] as const;

@ApiTags('reports')
@Controller()
export class CapitalisationController {
  public constructor(private readonly service: FinancialService) {}

  @Get('reports/capitalisation')
  @RequireRoles(...REPORT_ROLES)
  @ApiOperation({ summary: 'CAPEX/OPEX capitalisation report' })
  @ApiQuery({ name: 'from', required: true, type: String })
  @ApiQuery({ name: 'to', required: true, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiOkResponse({ description: 'Capitalisation report' })
  public async getCapitalisationReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('projectId') projectId?: string,
  ): Promise<CapitalisationReport> {
    if (!from || !to) {
      throw new BadRequestException('from and to query parameters are required.');
    }

    return this.service.getCapitalisationReport({ from, to, projectId });
  }
}

@ApiTags('admin')
@Controller('admin')
export class PeriodLocksController {
  public constructor(private readonly service: FinancialService) {}

  @Post('period-locks')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Lock a period for timesheet edits' })
  @ApiCreatedResponse({ description: 'Period lock created.' })
  public async createPeriodLock(
    @Body() dto: CreatePeriodLockDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<PeriodLockDto> {
    const lockedBy = req.principal?.personId ?? req.principal?.userId ?? 'unknown';

    try {
      return await this.service.createPeriodLock(dto, lockedBy);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create period lock.',
      );
    }
  }

  @Get('period-locks')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List all period locks' })
  @ApiOkResponse({ description: 'Period locks list.' })
  public async listPeriodLocks(): Promise<PeriodLockDto[]> {
    return this.service.listPeriodLocks();
  }

  @Delete('period-locks/:id')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a period lock' })
  public async deletePeriodLock(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    try {
      await this.service.deletePeriodLock(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to delete period lock.',
      );
    }
  }
}
