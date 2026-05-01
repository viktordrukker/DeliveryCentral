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

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt()
  public page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional() @Type(() => Number) @IsInt()
  public pageSize?: number;
}
