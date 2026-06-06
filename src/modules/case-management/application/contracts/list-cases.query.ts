import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ListCasesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  public caseTypeKey?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public ownerPersonId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public subjectPersonId?: string;

  // W2-02 — project-scoped Cases tab on Project Detail filters by relatedProjectId.
  @ApiPropertyOptional() @IsOptional() @IsString()
  public projectId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt()
  public page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional() @Type(() => Number) @IsInt()
  public pageSize?: number;
}
