import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListWorkEvidenceQueryDto {
  @ApiPropertyOptional()
  public personId?: string;

  @ApiPropertyOptional()
  public projectId?: string;

  @ApiPropertyOptional()
  public sourceType?: string;

  @ApiPropertyOptional()
  public dateFrom?: string;

  @ApiPropertyOptional()
  public dateTo?: string;
}
