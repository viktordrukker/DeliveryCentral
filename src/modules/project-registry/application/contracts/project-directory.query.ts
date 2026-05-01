import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProjectDirectoryQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  public source?: string;

  @ApiPropertyOptional({ description: 'Page number (1-indexed). When omitted the full result set is returned for back-compat.' })
  @IsOptional() @IsString()
  public page?: string;

  @ApiPropertyOptional({ description: 'Page size. When omitted the full result set is returned for back-compat.' })
  @IsOptional() @IsString()
  public pageSize?: string;
}
