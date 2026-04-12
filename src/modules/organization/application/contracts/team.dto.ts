import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

class TeamSummaryOrgUnitDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public name!: string;
}

export class TeamSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty()
  public description!: string | null;

  @ApiProperty({ type: TeamSummaryOrgUnitDto, nullable: true })
  public orgUnit!: TeamSummaryOrgUnitDto | null;

  @ApiProperty()
  public memberCount!: number;
}

export class TeamMemberDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public primaryEmail!: string | null;

  @ApiProperty({ nullable: true })
  public currentOrgUnitName!: string | null;

  @ApiProperty()
  public currentAssignmentCount!: number;
}

class TeamDashboardProjectDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public name!: string;
}

class TeamDashboardProjectSpreadMemberDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public activeProjectCount!: number;
}

class TeamDashboardProjectSpreadDto {
  @ApiProperty()
  public membersOnMultipleProjectsCount!: number;

  @ApiProperty()
  public maxProjectsPerMember!: number;

  @ApiProperty({ type: [TeamDashboardProjectSpreadMemberDto] })
  public membersOnMultipleProjects!: TeamDashboardProjectSpreadMemberDto[];
}

class TeamDashboardAnomalySummaryDto {
  @ApiProperty()
  public openExceptionCount!: number;

  @ApiProperty()
  public assignmentWithoutEvidenceCount!: number;

  @ApiProperty()
  public evidenceWithoutAssignmentCount!: number;

  @ApiProperty()
  public evidenceAfterAssignmentEndCount!: number;

  @ApiProperty()
  public staleApprovalCount!: number;

  @ApiProperty()
  public projectClosureConflictCount!: number;
}

export class TeamDashboardDto {
  @ApiProperty({ type: TeamSummaryDto })
  public team!: TeamSummaryDto;

  @ApiProperty()
  public teamMemberCount!: number;

  @ApiProperty()
  public activeAssignmentsCount!: number;

  @ApiProperty()
  public projectCount!: number;

  @ApiProperty({ type: [TeamDashboardProjectDto] })
  public projectsInvolved!: TeamDashboardProjectDto[];

  @ApiProperty({ type: [TeamMemberDto] })
  public peopleWithNoAssignments!: TeamMemberDto[];

  @ApiProperty({ type: [TeamMemberDto] })
  public peopleWithEvidenceAlignmentGaps!: TeamMemberDto[];

  @ApiProperty({ type: TeamDashboardProjectSpreadDto })
  public crossProjectSpread!: TeamDashboardProjectSpreadDto;

  @ApiProperty({ type: TeamDashboardAnomalySummaryDto })
  public anomalySummary!: TeamDashboardAnomalySummaryDto;
}

export class TeamListResponseDto {
  @ApiProperty({ type: [TeamSummaryDto] })
  public items!: TeamSummaryDto[];
}

export class TeamMembersResponseDto {
  @ApiProperty({ type: [TeamMemberDto] })
  public items!: TeamMemberDto[];
}

export class CreateTeamRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public code!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public name!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsString()
  @IsOptional()
  public description?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsOptional()
  public orgUnitId?: string | null;
}

export class UpdateTeamMemberRequestDto {
  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public personId!: string;

  @ApiProperty({
    description: 'Membership operation to apply to the team.',
    enum: ['add', 'remove'],
  })
  @IsIn(['add', 'remove'])
  @IsNotEmpty()
  public action!: 'add' | 'remove';
}
