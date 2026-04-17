import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ExceptionQueueCategory =
  | 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS'
  | 'STALE_ASSIGNMENT_APPROVAL';

export type ExceptionQueueStatus = 'OPEN' | 'RESOLVED' | 'SUPPRESSED';

export class ExceptionQueueItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public category!: ExceptionQueueCategory;

  @ApiProperty()
  public status!: ExceptionQueueStatus;

  @ApiProperty()
  public sourceContext!: 'assignment' | 'project';

  @ApiProperty()
  public summary!: string;

  @ApiProperty()
  public observedAt!: string;

  @ApiProperty()
  public targetEntityType!: string;

  @ApiProperty()
  public targetEntityId!: string;

  @ApiPropertyOptional()
  public projectId?: string;

  @ApiPropertyOptional()
  public personId?: string;

  @ApiPropertyOptional()
  public assignmentId?: string;

  @ApiPropertyOptional()
  public projectName?: string;

  @ApiPropertyOptional()
  public personDisplayName?: string;

  @ApiPropertyOptional()
  public details?: Record<string, unknown>;
}

export class ExceptionQueueSummaryDto {
  @ApiProperty()
  public total!: number;

  @ApiProperty()
  public open!: number;

  @ApiProperty({ type: Object })
  public byCategory!: Partial<Record<ExceptionQueueCategory, number>>;
}

export class ExceptionQueueResponseDto {
  @ApiProperty()
  public asOf!: string;

  @ApiProperty({ type: [ExceptionQueueItemDto] })
  public items!: ExceptionQueueItemDto[];

  @ApiProperty({ type: ExceptionQueueSummaryDto })
  public summary!: ExceptionQueueSummaryDto;
}
