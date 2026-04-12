import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListCasesQueryDto {
  @ApiPropertyOptional()
  public caseTypeKey?: string;

  @ApiPropertyOptional()
  public ownerPersonId?: string;

  @ApiPropertyOptional()
  public subjectPersonId?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  public page?: number;

  @ApiPropertyOptional({ default: 25 })
  @Type(() => Number)
  public pageSize?: number;
}
