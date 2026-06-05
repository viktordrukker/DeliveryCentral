import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

import { POSITION_FILL_STATUS_VALUES, PositionFillStatusValue } from '../../domain/value-objects/position-fill-status';

export class CreateProjectPositionRequestDto {
  @ApiProperty()
  @IsUUID('all')
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
  @IsUUID('all')
  requestedByPersonId?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  openImmediately?: boolean;
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
  @IsUUID('all')
  caseId?: string;

  @ApiProperty({
    required: false,
    description:
      'Person filling the position. Required for fill-side transitions (PROPOSED/BOOKED/ONBOARDING/ASSIGNED) when activePersonId is not already set.',
  })
  @IsOptional()
  @IsUUID('all')
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
  @IsUUID('all')
  projectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('all')
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
  @IsUUID('all', { each: true })
  personIds!: string[];

  @ApiProperty({ required: false, example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  asOf?: string;
}
