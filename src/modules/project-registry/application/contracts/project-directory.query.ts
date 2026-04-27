import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectDirectoryQueryDto {
  @ApiPropertyOptional()
  public source?: string;

  @ApiPropertyOptional({ description: 'Page number (1-indexed). When omitted the full result set is returned for back-compat.' })
  public page?: string;

  @ApiPropertyOptional({ description: 'Page size. When omitted the full result set is returned for back-compat.' })
  public pageSize?: string;
}
