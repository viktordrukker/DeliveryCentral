import { ApiProperty } from '@nestjs/swagger';

export class DashboardPersonSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;
}

export class DashboardProjectSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public name!: string;
}

export class WorkloadTrendPointDto {
  @ApiProperty()
  public week!: string;

  @ApiProperty()
  public activeAssignments!: number;
}

export class WorkloadDashboardSummaryDto {
  @ApiProperty()
  public totalActiveProjects!: number;

  @ApiProperty()
  public totalActiveAssignments!: number;

  @ApiProperty()
  public unassignedActivePeopleCount!: number;

  @ApiProperty()
  public projectsWithNoStaffCount!: number;

  @ApiProperty()
  public peopleWithNoActiveAssignmentsCount!: number;

  @ApiProperty()
  public projectsWithEvidenceButNoApprovedAssignmentCount!: number;

  @ApiProperty({ type: [DashboardProjectSummaryDto] })
  public projectsWithNoStaff!: DashboardProjectSummaryDto[];

  @ApiProperty({ type: [DashboardPersonSummaryDto] })
  public peopleWithNoActiveAssignments!: DashboardPersonSummaryDto[];

  @ApiProperty({ type: [DashboardProjectSummaryDto] })
  public projectsWithEvidenceButNoApprovedAssignment!: DashboardProjectSummaryDto[];
}
