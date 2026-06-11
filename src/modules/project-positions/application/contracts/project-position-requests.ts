import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { POSITION_FILL_STATUS_VALUES, PositionFillStatusValue } from '../../domain/value-objects/position-fill-status';

export class CreateProjectPositionRequestDto {
  @ApiProperty()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: '$property must be a UUID-shaped string' })
  projectId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  role!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  requiredAllocationPercent!: number;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: '$property must be a UUID-shaped string' })
  requestedByPersonId?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  openImmediately?: boolean;
}

/**
 * Payload for POST /project-positions/create-and-book — atomic direct
 * booking (create + OPEN→PROPOSED→BOOKED in one transaction). Validator
 * parity with `CreateProjectPositionRequestDto`.
 */
export class CreateAndBookProjectPositionRequestDto {
  @ApiProperty()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: '$property must be a UUID-shaped string' })
  projectId!: string;

  @ApiProperty()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: '$property must be a UUID-shaped string' })
  personId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  role!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationPercent!: number;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class TransitionProjectPositionFillRequestDto {
  @ApiProperty({ enum: POSITION_FILL_STATUS_VALUES })
  @IsIn(POSITION_FILL_STATUS_VALUES)
  toStatus!: PositionFillStatusValue;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: '$property must be a UUID-shaped string' })
  caseId?: string;

  @ApiProperty({
    required: false,
    description:
      'Person filling the position. Required for fill-side transitions (PROPOSED/BOOKED/ONBOARDING/ASSIGNED) when activePersonId is not already set. PROPOSED is only reachable from OPEN (never has an active person), so personId is unconditionally required there; the entity invariant covers the remaining fill statuses.',
  })
  @ValidateIf(
    (o: TransitionProjectPositionFillRequestDto) =>
      o.toStatus === 'PROPOSED' || o.personId !== undefined,
  )
  @IsDefined({ message: 'personId is required when toStatus is PROPOSED' })
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: '$property must be a UUID-shaped string' })
  personId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationPercent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  validTo?: string;
}

export class ListProjectPositionsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: '$property must be a UUID-shaped string' })
  projectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: '$property must be a UUID-shaped string' })
  activePersonId?: string;

  @ApiProperty({ required: false, enum: POSITION_FILL_STATUS_VALUES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(POSITION_FILL_STATUS_VALUES, { each: true })
  fillStatuses?: PositionFillStatusValue[];

  @ApiProperty({ required: false, example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  asOf?: string;

  @ApiProperty({ required: false, default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiProperty({ required: false, default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;
}

export class BenchCheckRequestDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { each: true, message: '$property entries must be UUID-shaped strings' })
  personIds!: string[];

  @ApiProperty({ required: false, example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  asOf?: string;
}

/**
 * LEAN-P4-missing-1 — payload for POST /project-positions/bulk-reassign.
 *
 * Validators use permissive UUID-shape regex to match the rest of this
 * file (also accepts seed pseudo-UUIDs).
 */
export class BulkReassignPositionsRequestDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { each: true, message: '$property entries must be UUID-shaped strings' })
  positionIds!: string[];

  @ApiProperty({
    required: false,
    description:
      'Person to reassign to. Omit to leave activePersonId unchanged. Pass null to unassign.',
    nullable: true,
  })
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: '$property must be a UUID-shaped string' })
  toPersonId?: string | null;

  @ApiProperty({
    required: false,
    description: 'Project to move positions to. Omit to leave projectId unchanged.',
  })
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: '$property must be a UUID-shaped string' })
  toProjectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkReassignPositionsResponseDto {
  @ApiProperty()
  reassigned!: number;
  @ApiProperty({ type: [String] })
  positionIds!: string[];
  @ApiProperty({ type: [String] })
  errors!: string[];
}
