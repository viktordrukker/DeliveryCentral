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
  Post,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import {
  BUDGET_DECIDE_ROLES,
  BUDGET_REQUEST_ROLES,
  BUDGET_ROLES,
} from '@src/shared/auth/role-presets';
import { Idempotent } from '@src/shared/http/idempotent.decorator';
import {
  OptionalReasonBodyDto,
  RequiredReasonBodyDto,
} from '@src/shared/http/reason-body.dto';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { BudgetChangeRequestDto } from '../application/contracts/budget-change-request.response';
import { RequestBudgetChangeBodyDto } from '../application/contracts/request-budget-change.dto';
import { DecideBudgetChangeService } from '../application/decide-budget-change.service';
import { FinancialService } from '../application/financial.service';
import { RequestBudgetChangeService } from '../application/request-budget-change.service';
import {
  CreatePersonCostRateDto,
  PersonCostRateDto,
  ProjectBudgetDashboard,
  ProjectBudgetDto,
  UpsertProjectBudgetDto,
} from '../application/contracts/financial.dto';

// F-61 / 20c-11 — dropped the hand-rolled `BudgetApprovalRowQuery` gateway
// interface and its `as unknown as BudgetApprovalRowQuery` coercion. The
// Prisma client already exposes the typed `budgetApproval` delegate.

@ApiTags('projects')
@Controller('projects')
export class ProjectBudgetController {
  public constructor(
    private readonly service: FinancialService,
    private readonly requestBudgetChangeService: RequestBudgetChangeService,
    private readonly decideBudgetChangeService: DecideBudgetChangeService,
    private readonly prisma: PrismaService,
  ) {}

  @Put(':id/budget')
  @RequireRoles(...BUDGET_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert project budget for fiscal year' })
  @ApiOkResponse({ description: 'Project budget.' })
  public async upsertBudget(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: UpsertProjectBudgetDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<ProjectBudgetDto> {
    try {
      // Sprint 4 / S4-5 — actor threads into the upsert so the
      // auto-triggered BudgetApproval row carries `requestedByPersonId`.
      const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;
      return await this.service.upsertProjectBudget(projectId, dto, actorId);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to upsert project budget.',
      );
    }
  }

  @Get(':id/budget-change-requests')
  @RequireRoles(...BUDGET_ROLES)
  @ApiOperation({
    summary:
      'F-3.1 / D-92 — list budget-change approvals for a project (defaults to PENDING).',
  })
  @ApiOkResponse({ description: 'Budget approvals for the project.' })
  public async listBudgetChangeRequests(
    @Param('id', ParseUUIDPipe) projectId: string,
  ): Promise<BudgetChangeRequestDto[]> {
    const rows = await this.prisma.budgetApproval.findMany({
      where: { projectBudget: { projectId }, status: 'PENDING' },
      orderBy: { requestedAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      publicId: null,
      projectBudgetId: r.projectBudgetId,
      status: r.status,
      requestedByPersonId: r.requestedByPersonId,
      requestedAt: r.requestedAt.toISOString(),
      requestedChange: (r.requestedChange as { capexBudget: number; opexBudget: number } | null) ?? null,
      decidedByPersonId: r.decidedByPersonId,
      decisionAt: r.decisionAt ? r.decisionAt.toISOString() : null,
      decisionReason: r.decisionReason,
    }));
  }

  @Post(':id/budget-change-requests')
  @RequireRoles(...BUDGET_REQUEST_ROLES)
  @HttpCode(HttpStatus.OK)
  @Idempotent()
  @ApiOperation({
    summary:
      'HD-6 — request a project budget change (does not mutate the live budget; awaits Director decision).',
  })
  @ApiOkResponse({ description: 'Pending budget approval row.' })
  public async requestBudgetChange(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: RequestBudgetChangeBodyDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<{ approvalId: string; requestedChange: { capexBudget: number; opexBudget: number } }> {
    const actorId =
      httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    try {
      return await this.requestBudgetChangeService.execute({
        actorId,
        projectId,
        fiscalYear: dto.fiscalYear,
        capexBudget: dto.capexBudget,
        opexBudget: dto.opexBudget,
        reason: dto.reason,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to request budget change.',
      );
    }
  }

  @Post(':id/budget-change-requests/:approvalId/approve')
  @RequireRoles(...BUDGET_DECIDE_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'HD-6 — Director approves a pending budget-change request. Applies the change atomically.',
  })
  @ApiOkResponse({ description: 'Decision result with the post-decision budget.' })
  public async approveBudgetChange(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
    @Body() body: OptionalReasonBodyDto | undefined,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<unknown> {
    const actorId =
      httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    return this.decideBudgetChangeService.execute({
      actorId,
      approvalId,
      decision: 'APPROVE',
      reason: body?.reason,
    });
  }

  @Post(':id/budget-change-requests/:approvalId/reject')
  @RequireRoles(...BUDGET_DECIDE_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'HD-6 — Director rejects a pending budget-change request. Reason required; live budget stays unchanged.',
  })
  @ApiOkResponse({ description: 'Decision result with the unchanged budget.' })
  public async rejectBudgetChange(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
    @Body() body: RequiredReasonBodyDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<unknown> {
    const actorId =
      httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    return this.decideBudgetChangeService.execute({
      actorId,
      approvalId,
      decision: 'REJECT',
      reason: body?.reason,
    });
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
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<PersonCostRateDto> {
    try {
      // F-124 / D-103-write-path round 34 — actor-audit threaded.
      const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;
      return await this.service.createPersonCostRate(personId, dto, actorId);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to set cost rate.',
      );
    }
  }
}
