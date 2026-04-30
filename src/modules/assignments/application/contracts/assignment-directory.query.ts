import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

// CRITICAL: every field needs a class-validator decorator. The global
// ValidationPipe runs with `whitelist: true`, which strips any property
// that has no validation metadata. Without these decorators, `personId`,
// `status`, etc. arrive at the controller as `undefined`, the `findByQuery`
// WHERE clause is empty, and the endpoint silently returns every
// assignment in the database — which is exactly what produced the bloated
// per-person workload timeline.
export class AssignmentDirectoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  public page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  public pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public personId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public to?: string;
}
