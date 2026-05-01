import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MetadataDictionaryQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  public entityType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public search?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public scopeOrgUnitId?: string;
}
