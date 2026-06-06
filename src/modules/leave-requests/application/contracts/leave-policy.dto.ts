import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveRequestType } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * LEAN-P4-missing-13 — request bodies for /admin/leave-policies CRUD.
 *
 * Bounds: 0 ≤ accrualPerYear ≤ 365, 0 ≤ maxCarryOver ≤ 365. Both are
 * day counts so we reuse the standard year-cap; the form blocks
 * anything higher upstream.
 */

export class CreateLeavePolicyBodyDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: LeaveRequestType })
  @IsEnum(LeaveRequestType)
  leaveType!: LeaveRequestType;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(365)
  accrualPerYear!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(365)
  maxCarryOver!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  approvalChain!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateLeavePolicyBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: LeaveRequestType })
  @IsOptional()
  @IsEnum(LeaveRequestType)
  leaveType?: LeaveRequestType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  accrualPerYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  maxCarryOver?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  approvalChain?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
