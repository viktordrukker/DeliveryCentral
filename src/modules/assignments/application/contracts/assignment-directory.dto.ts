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

  @ApiPropertyOptional({ enum: ['PROPOSAL', 'REVIEW', 'APPROVAL', 'RM_FINALIZE'] })
  public slaStage?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  public slaDueAt?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  public slaBreachedAt?: string | null;

  @ApiPropertyOptional()
  public requiresDirectorApproval?: boolean;
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

  // HD-3 — bill-rate pinning. Populated only after a successful BOOKED
  // transition + a matching rate-card lookup. Absent on PROPOSED/IN_REVIEW
  // (no booking yet) AND on BOOKED rows where the resolver returned NONE
  // (no matching card — FE renders a "missing rate card" banner).
  @ApiPropertyOptional()
  public appliedRateCardEntryId?: string;

  @ApiPropertyOptional()
  public effectiveBillRate?: number;

  @ApiPropertyOptional()
  public effectiveBillCurrency?: string;
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
