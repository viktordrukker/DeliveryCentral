import { ApiPropertyOptional } from '@nestjs/swagger';

export class MetadataDictionaryQueryDto {
  @ApiPropertyOptional()
  public entityType?: string;

  @ApiPropertyOptional()
  public search?: string;

  @ApiPropertyOptional()
  public scopeOrgUnitId?: string;
}
