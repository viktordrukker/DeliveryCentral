import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * SoT PR 14b — Lean "assignment directory item" sourced from the canonical
 * `ProjectPosition` aggregate. Mirrors the legacy `AssignmentDirectoryItemDto`
 * shape one-for-one so the existing FE consumers (employee dashboard,
 * notification CTAs) continue to render unchanged. Owned by the dashboard
 * module so the contract is independent from the legacy assignments module
 * (which retires with Sprint-5 contract migration).
 */
class PositionDirectoryPartySummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;
}

export class PositionDirectoryItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty({ type: PositionDirectoryPartySummaryDto })
  public person!: PositionDirectoryPartySummaryDto;

  @ApiProperty({ type: PositionDirectoryPartySummaryDto })
  public project!: PositionDirectoryPartySummaryDto;

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
