import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ExceptionQueueCategory =
  | 'ASSIGNMENT_WITHOUT_EVIDENCE'
  | 'M365_RECONCILIATION_ANOMALY'
  | 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS'
  | 'RADIUS_RECONCILIATION_ANOMALY'
  | 'STALE_ASSIGNMENT_APPROVAL'
  | 'WORK_EVIDENCE_AFTER_ASSIGNMENT_END'
  | 'WORK_EVIDENCE_WITHOUT_ASSIGNMENT';

export type ExceptionQueueStatus = 'OPEN' | 'RESOLVED' | 'SUPPRESSED';

export class ExceptionQueueItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public category!: ExceptionQueueCategory;

  @ApiProperty()
  public status!: ExceptionQueueStatus;

  @ApiProperty()
  public sourceContext!: 'assignment' | 'integration' | 'project' | 'work_evidence';

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
  public provider?: 'm365' | 'radius';

  @ApiPropertyOptional()
  public assignmentId?: string;

  @ApiPropertyOptional()
  public workEvidenceId?: string;

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

