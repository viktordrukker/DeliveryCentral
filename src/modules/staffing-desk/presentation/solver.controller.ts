import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { STAFFING_ROLES } from '@src/shared/auth/role-presets';

import {
  AutoMatchStrategy,
  WorkforcePlannerService,
} from '../application/workforce-planner.service';

const VALID_STRATEGIES = ['BALANCED', 'BEST_FIT', 'UTILIZE_BENCH', 'CHEAPEST', 'GROWTH'] as const;

class SolverConstraintsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pinnedAssignments?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minFillRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  maxOverallocation?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  horizonWeeks?: number;
}

class SolverRunRequestDto {
  @IsOptional()
  @IsUUID()
  scenarioId?: string;

  @IsIn(VALID_STRATEGIES)
  strategy!: (typeof VALID_STRATEGIES)[number];

  @IsOptional()
  @ValidateNested()
  @Type(() => SolverConstraintsDto)
  constraints?: SolverConstraintsDto;
}

export interface SolverProposedSegmentChange {
  benchPersonId: string;
  benchPersonName: string;
  targetProjectId: string;
  targetProjectName: string;
  demandId: string;
  demandRole: string;
  matchScore: number;
  cellClass: string;
}

export interface SolverRunResponse {
  proposedSegmentChanges: SolverProposedSegmentChange[];
  /** 0..100, strategy-specific. v1 = average matchScore × 100. */
  score: number;
  /** Human-readable summary of trade-offs. */
  explanation: string;
  /** Strategy that produced this result. */
  strategy: AutoMatchStrategy;
}

/**
 * FE-#267 — first-class solver entry point.
 *
 * Wraps the existing `WorkforcePlannerService.autoMatch()` solver (5
 * strategies, deterministic for a fixed input) under the stable URL the
 * Distribution Studio UI consumes.
 *
 * Determinism: the underlying solver is seeded by demand/bench order and
 * priority filters — for fixed (scenarioId, strategy, constraints) the
 * autoMatch result is identical between calls.
 */
@ApiTags('staffing')
@Controller('staffing/solver')
export class SolverController {
  public constructor(private readonly planner: WorkforcePlannerService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(...STAFFING_ROLES)
  @ApiOperation({
    summary:
      'FE-#267 — run the planner solver with a strategy + constraints; ' +
      'returns proposed segment changes for review.',
  })
  @ApiOkResponse({ type: Object })
  public async run(@Body() body: SolverRunRequestDto): Promise<SolverRunResponse> {
    if (!body) throw new BadRequestException('Body required.');
    const result = await this.planner.autoMatch({
      strategy: body.strategy,
      lockedPersonIds: body.constraints?.pinnedAssignments,
      weeks: body.constraints?.horizonWeeks,
    });

    const suggestions = result.suggestions;
    const avgScore =
      suggestions.length === 0
        ? 0
        : suggestions.reduce((acc, s) => acc + (s.matchScore ?? 0), 0) / suggestions.length;
    const score = Math.round(avgScore * 100);

    return {
      proposedSegmentChanges: suggestions.map((s) => ({
        benchPersonId: s.benchPersonId,
        benchPersonName: s.benchPersonName,
        targetProjectId: s.targetProjectId,
        targetProjectName: s.targetProjectName,
        demandId: s.demandId,
        demandRole: s.demandRole,
        matchScore: s.matchScore,
        cellClass: s.cellClass,
      })),
      score,
      explanation: buildExplanation(body.strategy, suggestions.length, result.unmatchedDemand.length),
      strategy: body.strategy,
    };
  }
}

function buildExplanation(strategy: AutoMatchStrategy, matched: number, unmatched: number): string {
  const blurb: Record<AutoMatchStrategy, string> = {
    BALANCED: 'Minimised variance across people utilisation.',
    BEST_FIT: 'Maximised per-role skill-match score.',
    UTILIZE_BENCH: 'Prioritised people currently on bench.',
    CHEAPEST: 'Minimised total cost using PersonCostRate.',
    GROWTH: 'Favoured mentee-mentor pairings and junior-senior balance.',
  };
  return `${blurb[strategy]} ${matched} suggestion(s); ${unmatched} demand(s) left unmatched.`;
}
