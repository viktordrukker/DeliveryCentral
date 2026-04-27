import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class NotificationQueueQueryDto {
  @ApiPropertyOptional({ enum: ['QUEUED', 'RETRYING', 'SENT', 'FAILED_TERMINAL'] })
  @IsOptional()
  @IsIn(['QUEUED', 'RETRYING', 'SENT', 'FAILED_TERMINAL'])
  public status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  public page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  public pageSize?: number;
}
