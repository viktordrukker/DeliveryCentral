import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class WorkloadDashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public asOf?: string;
}

export class WorkloadTrendQueryDto {
  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(52)
  public weeks?: number;
}
