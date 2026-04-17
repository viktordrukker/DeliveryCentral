import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max, IsUUID, IsDateString } from 'class-validator';
import { RiskCategory, RiskStrategy } from '@prisma/client';

// ── Request DTOs ─────────────────────────────────────────────────────────────

export class CreateProjectRiskDto {
  @IsString()
  @IsNotEmpty()
  public title!: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsEnum(RiskCategory)
  public category!: RiskCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  public probability?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  public impact?: number;

  @IsOptional()
  @IsEnum(RiskStrategy)
  public strategy?: RiskStrategy;

  @IsOptional()
  @IsString()
  public strategyDescription?: string;

  @IsOptional()
  @IsString()
  public damageControlPlan?: string;

  @IsOptional()
  @IsUUID()
  public ownerPersonId?: string;

  @IsOptional()
  @IsDateString()
  public dueDate?: string;
}

export class UpdateProjectRiskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  public title?: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsEnum(RiskCategory)
  public category?: RiskCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  public probability?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  public impact?: number;

  @IsOptional()
  @IsEnum(RiskStrategy)
  public strategy?: RiskStrategy;

  @IsOptional()
  @IsString()
  public strategyDescription?: string;

  @IsOptional()
  @IsString()
  public damageControlPlan?: string;

  @IsOptional()
  @IsUUID()
  public ownerPersonId?: string;

  @IsOptional()
  @IsUUID()
  public assigneePersonId?: string;

  @IsOptional()
  @IsDateString()
  public dueDate?: string;
}

export class ConvertToIssueDto {
  @IsUUID()
  public assigneePersonId!: string;
}

// ── Response DTOs ────────────────────────────────────────────────────────────

export interface ProjectRiskResponseDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  category: string;
  riskType: string;
  probability: number;
  impact: number;
  score: number;
  strategy: string | null;
  strategyDescription: string | null;
  damageControlPlan: string | null;
  status: string;
  ownerPersonId: string | null;
  ownerDisplayName: string | null;
  assigneePersonId: string | null;
  assigneeDisplayName: string | null;
  raisedAt: string;
  dueDate: string | null;
  resolvedAt: string | null;
  convertedFromRiskId: string | null;
  relatedCaseId: string | null;
}

export interface RiskMatrixCellDto {
  probability: number;
  impact: number;
  count: number;
  risks: { id: string; title: string }[];
}

export interface RiskSummaryDto {
  totalRisks: number;
  totalIssues: number;
  openRisks: number;
  openIssues: number;
  criticalCount: number;
  topRisks: ProjectRiskResponseDto[];
}
