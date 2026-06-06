import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class HeadcountTrendQueryDto {
  @ApiPropertyOptional({ default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  public months?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public asOf?: string;
}

export class HeadcountTrendPointDto {
  @ApiProperty({ description: 'YYYY-MM month label.' })
  public month!: string;

  @ApiProperty({ description: 'Active headcount at the last day of the month.' })
  public count!: number;
}
