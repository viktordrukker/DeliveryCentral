import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const REPORT_DATA_SOURCES = ['people', 'assignments', 'projects', 'timesheets', 'work_evidence'] as const;
const REPORT_FILTER_OPERATORS = ['eq', 'neq', 'gt', 'lt', 'contains', 'startsWith'] as const;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ReportFilterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public field!: string;

  @ApiProperty({ enum: REPORT_FILTER_OPERATORS })
  @IsIn([...REPORT_FILTER_OPERATORS])
  public operator!: (typeof REPORT_FILTER_OPERATORS)[number];

  @ApiProperty()
  @IsString()
  public value!: string;
}

/**
 * F-19 / 20c-09 — typed DTO replacing the inline
 * `Omit<ReportTemplate, 'id' | 'createdAt'>` on
 * `POST /reports/templates`. The shape is the same as the original
 * but each field now carries class-validator decorators so malformed
 * bodies fail at the boundary rather than inside the service.
 */
export class CreateReportTemplateRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  public name!: string;

  @ApiProperty()
  @IsString()
  @Matches(UUID_RE)
  public ownerPersonId!: string;

  @ApiProperty({ enum: REPORT_DATA_SOURCES })
  @IsIn([...REPORT_DATA_SOURCES])
  public dataSource!: (typeof REPORT_DATA_SOURCES)[number];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  public selectedColumns!: string[];

  @ApiPropertyOptional({ type: [ReportFilterDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  public filters?: ReportFilterDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public sortBy?: string;

  @ApiPropertyOptional({ enum: SORT_DIRECTIONS })
  @IsOptional()
  @IsIn([...SORT_DIRECTIONS])
  public sortDir?: (typeof SORT_DIRECTIONS)[number];

  @ApiProperty()
  @IsBoolean()
  public isShared!: boolean;
}
