import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlannedVsActualQueryDto {
  @ApiPropertyOptional()
  public asOf?: string;

  @ApiPropertyOptional()
  public projectId?: string;

  @ApiPropertyOptional()
  public personId?: string;
}
