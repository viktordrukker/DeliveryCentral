import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListWorkEvidenceQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  public personId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public projectId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public sourceType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public dateFrom?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public dateTo?: string;
}
