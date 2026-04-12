import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AssignmentPartySummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;
}

export class AssignmentDirectoryItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty({ type: AssignmentPartySummaryDto })
  public person!: AssignmentPartySummaryDto;

  @ApiProperty({ type: AssignmentPartySummaryDto })
  public project!: AssignmentPartySummaryDto;

  @ApiProperty()
  public staffingRole!: string;

  @ApiProperty()
  public allocationPercent!: number;

  @ApiProperty()
  public startDate!: string;

  @ApiProperty({ required: false, nullable: true })
  public endDate!: string | null;

  @ApiProperty()
  public approvalState!: string;

  @ApiProperty()
  public version!: number;
}

export class AssignmentHistoryItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public changeType!: string;

  @ApiPropertyOptional()
  public changeReason?: string;

  @ApiPropertyOptional()
  public changedByPersonId?: string;

  @ApiProperty()
  public occurredAt!: string;

  @ApiPropertyOptional()
  public previousSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional()
  public newSnapshot?: Record<string, unknown>;
}

export class AssignmentApprovalItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public decision!: string;

  @ApiPropertyOptional()
  public decisionReason?: string;

  @ApiPropertyOptional()
  public decidedByPersonId?: string;

  @ApiPropertyOptional()
  public decisionAt?: string;

  @ApiProperty()
  public sequenceNumber!: number;
}

export class AssignmentDetailsDto extends AssignmentDirectoryItemDto {
  @ApiPropertyOptional()
  public note?: string;

  @ApiProperty()
  public requestedAt!: string;

  @ApiPropertyOptional()
  public requestedByPersonId?: string;

  @ApiProperty()
  public canApprove!: boolean;

  @ApiProperty()
  public canReject!: boolean;

  @ApiProperty()
  public canEnd!: boolean;

  @ApiProperty({ type: [AssignmentApprovalItemDto] })
  public approvals!: AssignmentApprovalItemDto[];

  @ApiProperty({ type: [AssignmentHistoryItemDto] })
  public history!: AssignmentHistoryItemDto[];
}

export class AssignmentDirectoryResponseDto {
  @ApiProperty({ type: [AssignmentDirectoryItemDto] })
  public items!: AssignmentDirectoryItemDto[];

  @ApiProperty()
  public totalCount!: number;

  @ApiProperty()
  public page!: number;

  @ApiProperty()
  public pageSize!: number;
}
