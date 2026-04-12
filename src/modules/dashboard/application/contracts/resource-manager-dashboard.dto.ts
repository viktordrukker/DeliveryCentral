import { ApiProperty } from '@nestjs/swagger';

class ResourceManagerDashboardPersonSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty({ nullable: true })
  public primaryEmail!: string | null;
}

class ResourceTeamCapacitySummaryDto {
  @ApiProperty()
  public teamId!: string;

  @ApiProperty()
  public teamName!: string;

  @ApiProperty()
  public memberCount!: number;

  @ApiProperty()
  public activeAssignmentCount!: number;

  @ApiProperty()
  public activeProjectCount!: number;

  @ApiProperty()
  public unassignedPeopleCount!: number;

  @ApiProperty()
  public underallocatedPeopleCount!: number;

  @ApiProperty()
  public overallocatedPeopleCount!: number;
}

class ResourcePersonAllocationIndicatorDto {
  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public teamId!: string;

  @ApiProperty()
  public teamName!: string;

  @ApiProperty()
  public totalAllocationPercent!: number;

  @ApiProperty()
  public indicator!: string;
}

class ResourceAssignmentPipelineItemDto {
  @ApiProperty()
  public assignmentId!: string;

  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public personDisplayName!: string;

  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public projectName!: string;

  @ApiProperty()
  public startDate!: string;

  @ApiProperty()
  public approvalState!: string;
}

class ResourceTeamProjectLoadDto {
  @ApiProperty()
  public teamId!: string;

  @ApiProperty()
  public teamName!: string;

  @ApiProperty()
  public activeProjectCount!: number;

  @ApiProperty({ type: [String] })
  public projectNames!: string[];
}

class PendingAssignmentApprovalDto {
  @ApiProperty()
  public assignmentId!: string;

  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public personDisplayName!: string;

  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public projectName!: string;

  @ApiProperty()
  public requestedAt!: string;
}

class ResourceManagerSummaryDto {
  @ApiProperty()
  public managedTeamCount!: number;

  @ApiProperty()
  public totalManagedPeopleCount!: number;

  @ApiProperty()
  public peopleWithoutAssignmentsCount!: number;

  @ApiProperty()
  public futureAssignmentPipelineCount!: number;

  @ApiProperty()
  public pendingAssignmentApprovalCount!: number;
}

class IncomingStaffingRequestDto {
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

  @ApiProperty({ nullable: true })
  public summary!: string | null;
}

export class ResourceManagerDashboardResponseDto {
  @ApiProperty()
  public asOf!: string;

  @ApiProperty({ type: () => ResourceManagerDashboardPersonSummaryDto })
  public person!: ResourceManagerDashboardPersonSummaryDto;

  @ApiProperty({ type: () => ResourceManagerSummaryDto })
  public summary!: ResourceManagerSummaryDto;

  @ApiProperty({ type: () => [ResourceTeamCapacitySummaryDto] })
  public teamCapacitySummary!: ResourceTeamCapacitySummaryDto[];

  @ApiProperty({ type: () => [ResourcePersonAllocationIndicatorDto] })
  public peopleWithoutAssignments!: ResourcePersonAllocationIndicatorDto[];

  @ApiProperty({ type: () => [ResourcePersonAllocationIndicatorDto] })
  public allocationIndicators!: ResourcePersonAllocationIndicatorDto[];

  @ApiProperty({ type: () => [ResourceAssignmentPipelineItemDto] })
  public futureAssignmentPipeline!: ResourceAssignmentPipelineItemDto[];

  @ApiProperty({ type: () => [ResourceTeamProjectLoadDto] })
  public teamsInMultipleActiveProjects!: ResourceTeamProjectLoadDto[];

  @ApiProperty({ type: () => [PendingAssignmentApprovalDto] })
  public pendingAssignmentApprovals!: PendingAssignmentApprovalDto[];

  @ApiProperty({ type: () => [IncomingStaffingRequestDto] })
  public incomingRequests!: IncomingStaffingRequestDto[];

  @ApiProperty({ type: [String] })
  public dataSources!: string[];
}
