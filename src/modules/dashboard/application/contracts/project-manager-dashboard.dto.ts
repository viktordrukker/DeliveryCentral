import { ApiProperty } from '@nestjs/swagger';

class ProjectManagerDashboardPersonSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty({ nullable: true })
  public primaryEmail!: string | null;
}

class ManagedProjectDashboardItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty()
  public status!: string;

  @ApiProperty({ nullable: true })
  public plannedStartDate!: string | null;

  @ApiProperty({ nullable: true })
  public plannedEndDate!: string | null;

  @ApiProperty()
  public staffingCount!: number;

  @ApiProperty()
  public evidenceCount!: number;
}

class ProjectManagerStaffingSummaryDto {
  @ApiProperty()
  public managedProjectCount!: number;

  @ApiProperty()
  public activeAssignmentCount!: number;

  @ApiProperty()
  public projectsWithStaffingGapsCount!: number;

  @ApiProperty()
  public projectsWithEvidenceAnomaliesCount!: number;
}

class ProjectDashboardAttentionItemDto {
  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public projectName!: string;

  @ApiProperty()
  public reason!: string;

  @ApiProperty()
  public detail!: string;
}

class RecentlyChangedAssignmentItemDto {
  @ApiProperty()
  public assignmentId!: string;

  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public projectName!: string;

  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public personDisplayName!: string;

  @ApiProperty()
  public changeType!: string;

  @ApiProperty()
  public changedAt!: string;
}

class OpenStaffingRequestSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public role!: string;

  @ApiProperty()
  public priority!: string;

  @ApiProperty()
  public startDate!: string;

  @ApiProperty()
  public headcountRequired!: number;

  @ApiProperty()
  public headcountFulfilled!: number;
}

export class ProjectManagerDashboardResponseDto {
  @ApiProperty()
  public asOf!: string;

  @ApiProperty({ type: () => ProjectManagerDashboardPersonSummaryDto })
  public person!: ProjectManagerDashboardPersonSummaryDto;

  @ApiProperty({ type: () => [ManagedProjectDashboardItemDto] })
  public managedProjects!: ManagedProjectDashboardItemDto[];

  @ApiProperty({ type: () => ProjectManagerStaffingSummaryDto })
  public staffingSummary!: ProjectManagerStaffingSummaryDto;

  @ApiProperty({ type: () => [ProjectDashboardAttentionItemDto] })
  public projectsWithStaffingGaps!: ProjectDashboardAttentionItemDto[];

  @ApiProperty({ type: () => [ProjectDashboardAttentionItemDto] })
  public projectsWithEvidenceAnomalies!: ProjectDashboardAttentionItemDto[];

  @ApiProperty({ type: () => [RecentlyChangedAssignmentItemDto] })
  public recentlyChangedAssignments!: RecentlyChangedAssignmentItemDto[];

  @ApiProperty({ type: () => [ProjectDashboardAttentionItemDto] })
  public attentionProjects!: ProjectDashboardAttentionItemDto[];

  @ApiProperty()
  public openRequestCount!: number;

  @ApiProperty({ type: () => [OpenStaffingRequestSummaryDto] })
  public openRequests!: OpenStaffingRequestSummaryDto[];

  @ApiProperty({ type: [String] })
  public dataSources!: string[];
}
