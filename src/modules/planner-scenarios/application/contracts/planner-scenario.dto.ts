/**
 * Issue 266 / LEAN-P4a-1 — Distribution Studio planner-scenario shapes.
 *
 * Backed by the `PlannerScenario` Prisma model. The `state` JSON column
 * holds the proposed assignments + an optional baseline-snapshot pointer
 * the UI threads through. LEAN-P4a-1 added tenant + status + audit
 * columns + DM-2.5 publicId; the contract surface exposes both `id`
 * (legacy, transitional) and `publicId` so callers can migrate.
 */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const PLANNER_SCENARIO_STATUSES = ['DRAFT', 'SUBMITTED', 'APPLIED', 'CANCELLED'] as const;
export type PlannerScenarioStatusLiteral = (typeof PLANNER_SCENARIO_STATUSES)[number];

export interface PlannerScenarioProposedAssignmentDto {
  positionId: string;
  personId: string;
  startDate: string;
  endDate: string;
  allocationPercent: number;
}

export interface PlannerScenarioStateDto {
  proposedAssignments: PlannerScenarioProposedAssignmentDto[];
  baselineSnapshotId?: string | null;
}

export interface PlannerScenarioSummaryDto {
  assignments: number;
  hires: number;
  releases: number;
  extensions: number;
  anomalies: number;
}

export interface PlannerScenarioDto {
  id: string;
  publicId: string | null;
  ownerId: string;
  tenantId: string | null;
  status: PlannerScenarioStatusLiteral;
  name: string;
  description: string | null;
  state: PlannerScenarioStateDto;
  summary: PlannerScenarioSummaryDto;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

class ProposedAssignmentInput implements PlannerScenarioProposedAssignmentDto {
  @IsString()
  @IsUUID()
  public positionId!: string;

  @IsString()
  @IsUUID()
  public personId!: string;

  @IsISO8601()
  public startDate!: string;

  @IsISO8601()
  public endDate!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  public allocationPercent!: number;
}

class ScenarioStateInput implements PlannerScenarioStateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposedAssignmentInput)
  public proposedAssignments!: PlannerScenarioProposedAssignmentDto[];

  @IsOptional()
  @IsString()
  public baselineSnapshotId?: string | null;
}

export class CreatePlannerScenarioRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public description?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScenarioStateInput)
  public state?: PlannerScenarioStateDto;

  @IsOptional()
  @IsObject()
  public summary?: PlannerScenarioSummaryDto;
}

export class UpdatePlannerScenarioRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public description?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScenarioStateInput)
  public state?: PlannerScenarioStateDto;

  @IsOptional()
  @IsIn(PLANNER_SCENARIO_STATUSES)
  public status?: PlannerScenarioStatusLiteral;
}

export class ListPlannerScenariosQueryDto {
  @IsOptional()
  @IsString()
  public owner?: string;

  @IsOptional()
  @IsIn(PLANNER_SCENARIO_STATUSES)
  public status?: PlannerScenarioStatusLiteral;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  public limit?: number;
}
