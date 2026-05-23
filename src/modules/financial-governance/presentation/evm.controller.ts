import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { EXEC_ROLES } from '@src/shared/auth/role-presets';

import {
  EvmComputationService,
  EvmRunSummary,
  EvmSnapshot,
} from '../application/evm-computation.service';

interface EvmRunBody {
  fiscalYear?: number;
}

/**
 * Sprint 4 / S4-1 — admin trigger surface for EVM recompute.
 *
 * Per-project recompute lives under `/api/projects/:id/evm/recompute`;
 * portfolio-wide recompute lives under `/api/admin/evm/recompute-all`.
 * Both write to `ProjectBudget` (which the Radiator already reads — S4-2).
 *
 * Cron is deliberately deferred. Today operators (or a follow-up
 * `@nestjs/schedule` module) call these endpoints; the Radiator picks
 * up the truthful numbers on its next render.
 */

@ApiTags('projects')
@Controller('projects')
export class ProjectEvmController {
  public constructor(private readonly service: EvmComputationService) {}

  @Post(':id/evm/recompute')
  @RequireRoles(...EXEC_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'S4-1 — recompute EVM (AC/EV/PV/EAC/capex %) for one project + fiscal year ' +
      'and persist to ProjectBudget. Returns the diagnostic snapshot.',
  })
  @ApiOkResponse({ description: 'EVM snapshot.' })
  public async recomputeProject(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query('fiscalYear', new ParseIntPipe({ optional: true }))
    fiscalYear: number | undefined,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<EvmSnapshot> {
    const actorId =
      httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    const fy = fiscalYear ?? new Date().getUTCFullYear();
    try {
      return await this.service.recomputeForProject(projectId, fy, actorId);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to recompute EVM.',
      );
    }
  }
}

@ApiTags('admin')
@Controller('admin')
export class AdminEvmController {
  public constructor(private readonly service: EvmComputationService) {}

  @Post('evm/recompute-all')
  @RequireRoles(...EXEC_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'S4-1 — recompute EVM for every project in the given fiscal year (defaults ' +
      'to current UTC year). Projects without a ProjectBudget row are skipped (counted).',
  })
  @ApiOkResponse({ description: 'Portfolio-wide run summary.' })
  public async recomputeAll(
    @Body() body: EvmRunBody | undefined,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<EvmRunSummary> {
    const actorId =
      httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    try {
      return await this.service.recomputeAllProjects(actorId, body?.fiscalYear);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to recompute EVM portfolio-wide.',
      );
    }
  }
}
