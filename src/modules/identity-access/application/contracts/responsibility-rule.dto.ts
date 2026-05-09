import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

// UUID-shape validator that accepts all generated forms (including
// the seed's non-RFC-conforming `bbbb0001-…` test UUIDs). The DB FK
// constraint enforces semantic validity.
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// HD-4 — Admin-facing DTOs for the responsibility-rule CRUD endpoints.
// Mirrors the resolver's typed action / scope / mode union types.

const ACTION_KINDS = [
  'PROJECT_ACTIVATION_APPROVAL',
  'BUDGET_CHANGE_APPROVAL',
  'ASSIGNMENT_DIRECTOR_APPROVAL',
  'ASSIGNMENT_OVERRIDE_APPROVAL',
  'PERSON_RELEASE_HR_APPROVAL',
  'PERSON_RELEASE_DIRECTOR_APPROVAL',
  'PROJECT_CLOSE_APPROVAL',
] as const;
export type ResponsibilityActionKindStr = (typeof ACTION_KINDS)[number];

const SCOPE_KINDS = [
  'TENANT',
  'ORG_UNIT',
  'CLIENT',
  'PROJECT',
  'PROJECT_TYPE',
  'THRESHOLD_AMOUNT',
  'ROLE_GRADE',
] as const;
export type ResponsibilityScopeStr = (typeof SCOPE_KINDS)[number];

const MODES = ['ROLE', 'PERSON', 'PM_SOLO', 'SKIP'] as const;
export type ResponsibilityModeStr = (typeof MODES)[number];

export class ResponsibilityRuleResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty({ enum: ACTION_KINDS })
  public actionKind!: ResponsibilityActionKindStr;

  @ApiProperty({ enum: SCOPE_KINDS })
  public scopeKind!: ResponsibilityScopeStr;

  @ApiPropertyOptional({ description: 'Opaque value tied to scopeKind. NULL for TENANT.' })
  public scopeValue!: string | null;

  @ApiProperty({ enum: MODES })
  public mode!: ResponsibilityModeStr;

  @ApiPropertyOptional({ description: "Populated when mode='ROLE'." })
  public targetRole!: string | null;

  @ApiPropertyOptional({ description: "Populated when mode='PERSON'." })
  public targetPersonId!: string | null;

  @ApiProperty({ description: 'Lower number = higher precedence.' })
  public priority!: number;

  @ApiProperty()
  public isActive!: boolean;

  @ApiPropertyOptional()
  public notes!: string | null;

  @ApiPropertyOptional()
  public tenantId!: string | null;

  @ApiProperty()
  public createdAt!: string;

  @ApiProperty()
  public updatedAt!: string;

  @ApiPropertyOptional()
  public archivedAt!: string | null;

  // True for the 7 default rules seeded by `seedResponsibilityRules()`.
  // The FE shows a "default" badge so admins know clobbering them
  // resets behaviour to controller-only role gating.
  @ApiProperty()
  public isSeededDefault!: boolean;
}

export class CreateResponsibilityRuleDto {
  @ApiProperty({ enum: ACTION_KINDS })
  @IsEnum(ACTION_KINDS)
  public actionKind!: ResponsibilityActionKindStr;

  @ApiProperty({ enum: SCOPE_KINDS })
  @IsEnum(SCOPE_KINDS)
  public scopeKind!: ResponsibilityScopeStr;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public scopeValue?: string | null;

  @ApiProperty({ enum: MODES })
  @IsEnum(MODES)
  public mode!: ResponsibilityModeStr;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public targetRole?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(UUID_SHAPE)
  public targetPersonId?: string | null;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 999 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  public priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(UUID_SHAPE)
  public tenantId?: string | null;
}

export class UpdateResponsibilityRuleDto {
  @ApiPropertyOptional({ enum: MODES })
  @IsOptional()
  @IsEnum(MODES)
  public mode?: ResponsibilityModeStr;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public targetRole?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(UUID_SHAPE)
  public targetPersonId?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 999 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  public priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public notes?: string | null;
}

export const RESPONSIBILITY_ACTION_KINDS = ACTION_KINDS;
export const RESPONSIBILITY_SCOPE_KINDS = SCOPE_KINDS;
export const RESPONSIBILITY_MODES = MODES;
