import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { FinancialService } from '../application/financial.service';
import {
  CreatePersonCostRateDto,
  PersonCostRateDto,
  ProjectBudgetDashboard,
  ProjectBudgetDto,
  UpsertProjectBudgetDto,
} from '../application/contracts/financial.dto';

const BUDGET_ROLES = ['admin', 'project_manager', 'delivery_manager', 'director'] as const;

@ApiTags('projects')
@Controller('projects')
export class ProjectBudgetController {
  public constructor(private readonly service: FinancialService) {}

  @Put(':id/budget')
  @RequireRoles(...BUDGET_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert project budget for fiscal year' })
  @ApiOkResponse({ description: 'Project budget.' })
  public async upsertBudget(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: UpsertProjectBudgetDto,
  ): Promise<ProjectBudgetDto> {
    try {
      return await this.service.upsertProjectBudget(projectId, dto);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to upsert project budget.',
      );
    }
  }

  @Get(':id/budget-dashboard')
  @RequireRoles(...BUDGET_ROLES)
  @ApiOperation({ summary: 'Get project budget dashboard' })
  @ApiOkResponse({ description: 'Project budget dashboard.' })
  public async getBudgetDashboard(
    @Param('id', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectBudgetDashboard> {
    try {
      return await this.service.getProjectBudgetDashboard(projectId);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to load budget dashboard.',
      );
    }
  }
}

@ApiTags('people')
@Controller('people')
export class PersonCostRateController {
  public constructor(private readonly service: FinancialService) {}

  @Put(':id/cost-rate')
  @RequireRoles('admin', 'hr_manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set person cost rate' })
  @ApiOkResponse({ description: 'Person cost rate.' })
  public async setCostRate(
    @Param('id', ParseUUIDPipe) personId: string,
    @Body() dto: CreatePersonCostRateDto,
  ): Promise<PersonCostRateDto> {
    try {
      return await this.service.createPersonCostRate(personId, dto);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to set cost rate.',
      );
    }
  }
}
