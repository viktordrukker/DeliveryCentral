import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
  
  
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkProjectAssignmentEntryDto {
  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public projectId!: string;

  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public personId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public staffingRole!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  public allocationPercent!: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  public startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  public endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public note?: string;
}

export class BulkProjectAssignmentRequestDto {
  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public actorId!: string;

  @ApiProperty({ type: [BulkProjectAssignmentEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkProjectAssignmentEntryDto)
  public entries!: BulkProjectAssignmentEntryDto[];
}
