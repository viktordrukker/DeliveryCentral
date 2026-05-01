import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { ExceptionQueueCategory, ExceptionQueueStatus } from './exception-queue.dto';

export class ExceptionQueueQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  public asOf?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public category?: ExceptionQueueCategory;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public limit?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['m365', 'radius'])
  public provider?: 'm365' | 'radius';

  @ApiPropertyOptional() @IsOptional() @IsString()
  public status?: ExceptionQueueStatus;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public targetEntityId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  public targetEntityType?: string;
}
