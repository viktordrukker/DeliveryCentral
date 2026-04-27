import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateReportingLineRequestDto {
  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public personId!: string;

  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public managerId!: string;

  @ApiProperty({ enum: ['SOLID'] })
  @IsEnum(['SOLID'] as const)
  @IsNotEmpty()
  public type!: 'SOLID';

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  public startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  public endDate?: string;
}
