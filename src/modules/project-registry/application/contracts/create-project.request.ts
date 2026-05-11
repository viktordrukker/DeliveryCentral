import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROJECT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export class CreateProjectRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public description?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  public startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  public plannedEndDate?: string;

  @ApiProperty()
  @Matches(UUID_RE)
  @IsNotEmpty()
  public projectManagerId!: string;

  // Sprint F-0.6 (B-05 / D-53) — these fields were silently dropped by the
  // global ValidationPipe `whitelist: true` because the DTO didn't declare
  // them. The FE form sent them; the BE service handled them; the DTO
  // throwing them away meant `priority: HIGH` arrived at the service as
  // `undefined`, which fell back to `'MEDIUM'` (silent overwrite).
  // Adding the missing fields closes the round-trip.

  @ApiPropertyOptional({ enum: PROJECT_PRIORITIES })
  @IsOptional()
  @IsIn([...PROJECT_PRIORITIES])
  public priority?: (typeof PROJECT_PRIORITIES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public projectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public engagementModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_RE)
  public deliveryManagerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public clientId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public techStack?: string[];
}
