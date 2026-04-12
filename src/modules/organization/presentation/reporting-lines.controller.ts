import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { AssignLineManagerService } from '../application/assign-line-manager.service';
import { TerminateReportingLineService } from '../application/terminate-reporting-line.service';
import { CreateReportingLineRequestDto } from '../application/contracts/create-reporting-line.request';
import { ReportingLineResponseDto } from '../application/contracts/reporting-line.response';
import { ReportingLine } from '../domain/entities/reporting-line.entity';

class TerminateReportingLineRequestDto {
  endDate!: string;
}

@ApiTags('reporting-lines')
@Controller('org/reporting-lines')
export class ReportingLinesController {
  public constructor(
    private readonly assignLineManagerService: AssignLineManagerService,
    private readonly terminateReportingLineService: TerminateReportingLineService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a solid-line manager with effective dates' })
  @ApiCreatedResponse({ type: ReportingLineResponseDto })
  @ApiNotFoundResponse({ description: 'Employee or manager not found.' })
  @RequireRoles('resource_manager', 'director', 'hr_manager', 'admin')
  public async createReportingLine(
    @Body() request: CreateReportingLineRequestDto,
  ): Promise<ReportingLineResponseDto> {
    return this.mapResponse(
      await this.withErrors(() => this.assignLineManagerService.execute(request)),
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate a reporting line by setting its end date' })
  @ApiOkResponse({ type: ReportingLineResponseDto })
  @ApiNotFoundResponse({ description: 'Reporting line not found.' })
  @RequireRoles('resource_manager', 'director', 'hr_manager', 'admin')
  public async terminateReportingLine(
    @Param('id') id: string,
    @Body() request: TerminateReportingLineRequestDto,
  ): Promise<ReportingLineResponseDto> {
    return this.mapResponse(
      await this.withErrors(() =>
        this.terminateReportingLineService.execute({
          endDate: request.endDate,
          reportingLineId: id,
        }),
      ),
    );
  }

  private mapResponse(reportingLine: ReportingLine): ReportingLineResponseDto {
    return {
      endDate: reportingLine.effectiveDateRange.endsAt?.toISOString(),
      id: reportingLine.id,
      managerId: reportingLine.managerId.value,
      personId: reportingLine.subjectId.value,
      startDate: reportingLine.effectiveDateRange.startsAt.toISOString(),
      type: 'SOLID',
    };
  }

  private async withErrors(work: () => Promise<ReportingLine>): Promise<ReportingLine> {
    try {
      return await work();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reporting line creation failed.';

      if (
        message === 'Employee does not exist.' ||
        message === 'Manager does not exist.' ||
        message === 'Reporting line not found.'
      ) {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }
}
