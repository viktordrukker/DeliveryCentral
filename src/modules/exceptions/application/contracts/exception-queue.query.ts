import { ApiPropertyOptional } from '@nestjs/swagger';

import { ExceptionQueueCategory, ExceptionQueueStatus } from './exception-queue.dto';

export class ExceptionQueueQueryDto {
  @ApiPropertyOptional()
  public asOf?: string;

  @ApiPropertyOptional()
  public category?: ExceptionQueueCategory;

  @ApiPropertyOptional()
  public limit?: string;

  @ApiPropertyOptional()
  public provider?: 'm365' | 'radius';

  @ApiPropertyOptional()
  public status?: ExceptionQueueStatus;

  @ApiPropertyOptional()
  public targetEntityId?: string;

  @ApiPropertyOptional()
  public targetEntityType?: string;
}

