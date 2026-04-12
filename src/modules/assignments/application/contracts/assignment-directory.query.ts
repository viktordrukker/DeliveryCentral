import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignmentDirectoryQueryDto {
  @ApiPropertyOptional()
  public from?: string;

  @ApiPropertyOptional()
  public page?: number;

  @ApiPropertyOptional()
  public pageSize?: number;

  @ApiPropertyOptional()
  public personId?: string;

  @ApiPropertyOptional()
  public projectId?: string;

  @ApiPropertyOptional()
  public status?: string;

  @ApiPropertyOptional()
  public to?: string;
}
