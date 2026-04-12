import { ApiPropertyOptional } from '@nestjs/swagger';

export class WorkloadDashboardQueryDto {
  @ApiPropertyOptional()
  public asOf?: string;
}

export class WorkloadTrendQueryDto {
  @ApiPropertyOptional({ default: 12 })
  public weeks?: string;
}
