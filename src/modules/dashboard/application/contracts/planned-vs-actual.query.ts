import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PlannedVsActualQueryDto {
  @ApiPropertyOptional()
  public asOf?: string;

  @ApiPropertyOptional()
  public projectId?: string;

  @ApiPropertyOptional()
  public personId?: string;

  @ApiPropertyOptional({ description: 'Number of ISO weeks to include (default 4, max 12)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  public weeks?: number;
}
