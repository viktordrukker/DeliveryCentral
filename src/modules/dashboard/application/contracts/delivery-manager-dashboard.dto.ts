import { ApiProperty } from '@nestjs/swagger';

class DeliveryManagerDashboardSummaryDto {
  @ApiProperty()
  public totalActiveProjects!: number;

  @ApiProperty()
  public totalActiveAssignments!: number;

  @ApiProperty()
  public projectsWithNoStaff!: number;

  @ApiProperty()
  public projectsWithEvidenceAnomalies!: number;

  @ApiProperty()
  public inactiveEvidenceProjectCount!: number;
}

class DeliveryManagerReconciliationDto {
  @ApiProperty()
  public matchedCount!: number;

  @ApiProperty()
  public assignedButNoEvidenceCount!: number;

  @ApiProperty()
  public evidenceWithoutAssignmentCount!: number;
}

class ProjectHealthItemDto {
  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty()
  public status!: string;

  @ApiProperty()
  public staffingCount!: number;

  @ApiProperty()
  public evidenceCount!: number;

  @ApiProperty({ type: [String] })
  public anomalyFlags!: string[];
}

class InactiveEvidenceProjectItemDto {
  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty({ nullable: true })
  public lastEvidenceDate!: string | null;

  @ApiProperty()
  public activeAssignmentCount!: number;
}

class StaffingGapItemDto {
  @ApiProperty()
  public assignmentId!: string;

  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public projectName!: string;

  @ApiProperty()
  public endDate!: string;

  @ApiProperty()
  public daysUntilEnd!: number;
}

class OpenRequestsByProjectItemDto {
  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public projectName!: string;

  @ApiProperty()
  public openRequestCount!: number;

  @ApiProperty()
  public totalHeadcountRequired!: number;

  @ApiProperty()
  public totalHeadcountFulfilled!: number;
}

class BurnRateTrendPointDto {
  @ApiProperty()
  public week!: string;

  @ApiProperty()
  public evidenceCount!: number;

  @ApiProperty()
  public projectCount!: number;
}

class ScorecardHistoryPointDto {
  @ApiProperty()
  public weekStart!: string;

  @ApiProperty()
  public staffingPct!: number;

  @ApiProperty()
  public evidencePct!: number;

  @ApiProperty()
  public timelinePct!: number;
}

export class ProjectScorecardHistoryItemDto {
  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public projectName!: string;

  @ApiProperty({ type: () => [ScorecardHistoryPointDto] })
  public history!: ScorecardHistoryPointDto[];
}

export class DeliveryManagerDashboardResponseDto {
  @ApiProperty()
  public asOf!: string;

  @ApiProperty({ type: () => DeliveryManagerDashboardSummaryDto })
  public summary!: DeliveryManagerDashboardSummaryDto;

  @ApiProperty({ type: () => DeliveryManagerReconciliationDto })
  public reconciliation!: DeliveryManagerReconciliationDto;

  @ApiProperty({ type: () => [ProjectHealthItemDto] })
  public portfolioHealth!: ProjectHealthItemDto[];

  @ApiProperty({ type: () => [InactiveEvidenceProjectItemDto] })
  public inactiveEvidenceProjects!: InactiveEvidenceProjectItemDto[];

  @ApiProperty({ type: () => [StaffingGapItemDto] })
  public staffingGaps!: StaffingGapItemDto[];

  @ApiProperty({ type: () => [OpenRequestsByProjectItemDto] })
  public openRequestsByProject!: OpenRequestsByProjectItemDto[];

  @ApiProperty({ type: () => [BurnRateTrendPointDto] })
  public burnRateTrend!: BurnRateTrendPointDto[];

  @ApiProperty({ type: [String] })
  public dataSources!: string[];
}
