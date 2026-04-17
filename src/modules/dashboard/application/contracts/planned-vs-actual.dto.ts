import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/* ── Shared nested DTOs ───────────────────────────────────────── */

class ComparisonPersonSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;
}

class ComparisonProjectSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public name!: string;
}

/* ── Existing detail DTOs (unchanged) ─────────────────────────── */

class AssignedWithoutEvidenceDto {
  @ApiProperty()
  public assignmentId!: string;

  @ApiProperty({ type: ComparisonPersonSummaryDto })
  public person!: ComparisonPersonSummaryDto;

  @ApiProperty({ type: ComparisonProjectSummaryDto })
  public project!: ComparisonProjectSummaryDto;

  @ApiProperty()
  public staffingRole!: string;

  @ApiProperty()
  public allocationPercent!: number;
}

class EvidenceWithoutApprovedAssignmentDto {
  @ApiProperty()
  public workEvidenceId!: string;

  @ApiProperty({ type: ComparisonPersonSummaryDto })
  public person!: ComparisonPersonSummaryDto;

  @ApiProperty({ type: ComparisonProjectSummaryDto })
  public project!: ComparisonProjectSummaryDto;

  @ApiProperty()
  public sourceType!: string;

  @ApiProperty()
  public effortHours!: number;

  @ApiProperty()
  public activityDate!: string;
}

class MatchedRecordDto {
  @ApiProperty()
  public assignmentId!: string;

  @ApiProperty()
  public workEvidenceId!: string;

  @ApiProperty({ type: ComparisonPersonSummaryDto })
  public person!: ComparisonPersonSummaryDto;

  @ApiProperty({ type: ComparisonProjectSummaryDto })
  public project!: ComparisonProjectSummaryDto;

  @ApiProperty()
  public staffingRole!: string;

  @ApiProperty()
  public effortHours!: number;

  @ApiProperty()
  public allocationPercent!: number;
}

class ComparisonAnomalyDto {
  @ApiProperty()
  public type!: string;

  @ApiProperty()
  public message!: string;

  @ApiProperty({ type: ComparisonPersonSummaryDto })
  public person!: ComparisonPersonSummaryDto;

  @ApiProperty({ type: ComparisonProjectSummaryDto })
  public project!: ComparisonProjectSummaryDto;
}

/* ── NEW: Timesheet status summary ─────────────────────────────── */

export class TimesheetStatusSummaryDto {
  @ApiProperty()
  public totalHours!: number;

  @ApiProperty()
  public approvedHours!: number;

  @ApiProperty()
  public submittedHours!: number;

  @ApiProperty()
  public draftHours!: number;

  @ApiProperty()
  public rejectedHours!: number;

  @ApiProperty()
  public personCount!: number;

  @ApiProperty()
  public missingPersonCount!: number;

  @ApiProperty({ type: [String] })
  public missingPersonIds!: string[];
}

/* ── NEW: Per-project summary ──────────────────────────────────── */

export class ProjectPvaSummaryDto {
  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public projectName!: string;

  @ApiProperty()
  public plannedHours!: number;

  @ApiProperty()
  public approvedHours!: number;

  @ApiProperty()
  public submittedHours!: number;

  @ApiProperty()
  public draftHours!: number;

  @ApiProperty()
  public totalActualHours!: number;

  @ApiProperty()
  public assignmentCount!: number;

  @ApiProperty()
  public openStaffingRequests!: number;

  @ApiProperty()
  public unfilledHeadcount!: number;

  @ApiProperty()
  public variance!: number;

  @ApiProperty()
  public variancePercent!: number;

  @ApiProperty()
  public overSubmitted!: boolean;
}

/* ── NEW: Per-org-unit summary ─────────────────────────────────── */

export class OrgUnitPvaSummaryDto {
  @ApiProperty()
  public orgUnitId!: string;

  @ApiProperty()
  public orgUnitName!: string;

  @ApiProperty()
  public personCount!: number;

  @ApiProperty()
  public plannedHours!: number;

  @ApiProperty()
  public submittedHours!: number;

  @ApiProperty()
  public approvedHours!: number;

  @ApiProperty()
  public draftHours!: number;

  @ApiProperty()
  public submissionRate!: number;

  @ApiProperty()
  public variance!: number;
}

/* ── NEW: Per-resource-pool summary ────────────────────────────── */

export class ResourcePoolPvaSummaryDto {
  @ApiProperty()
  public poolId!: string;

  @ApiProperty()
  public poolName!: string;

  @ApiProperty()
  public personCount!: number;

  @ApiProperty()
  public plannedHours!: number;

  @ApiProperty()
  public submittedHours!: number;

  @ApiProperty()
  public approvedHours!: number;

  @ApiProperty()
  public draftHours!: number;

  @ApiProperty()
  public submissionRate!: number;

  @ApiProperty()
  public variance!: number;
}

/* ── NEW: Staffing coverage ────────────────────────────────────── */

class UnstaffedProjectDto {
  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public projectName!: string;

  @ApiProperty()
  public openRequests!: number;

  @ApiProperty()
  public unfilledHeadcount!: number;

  @ApiProperty({ type: [String] })
  public roles!: string[];
}

export class StaffingCoverageDto {
  @ApiProperty()
  public projectsFullyStaffed!: number;

  @ApiProperty()
  public projectsPartiallyStaffed!: number;

  @ApiProperty()
  public projectsWithOpenRequests!: number;

  @ApiProperty()
  public totalOpenRequests!: number;

  @ApiProperty()
  public totalUnfilledHeadcount!: number;

  @ApiProperty({ type: [UnstaffedProjectDto] })
  public unstaffedProjects!: UnstaffedProjectDto[];
}

/* ── Top-level response ────────────────────────────────────────── */

export class PlannedVsActualResponseDto {
  @ApiProperty()
  public asOf!: string;

  @ApiProperty()
  public weekStart!: string;

  @ApiProperty()
  public weekEnd!: string;

  @ApiProperty()
  public weeksIncluded!: number;

  /* Existing detail lists */

  @ApiProperty({ type: [AssignedWithoutEvidenceDto] })
  public assignedButNoEvidence!: AssignedWithoutEvidenceDto[];

  @ApiProperty({ type: [EvidenceWithoutApprovedAssignmentDto] })
  public evidenceButNoApprovedAssignment!: EvidenceWithoutApprovedAssignmentDto[];

  @ApiProperty({ type: [MatchedRecordDto] })
  public matchedRecords!: MatchedRecordDto[];

  @ApiProperty({ type: [ComparisonAnomalyDto] })
  public anomalies!: ComparisonAnomalyDto[];

  /* NEW aggregations */

  @ApiProperty({ type: TimesheetStatusSummaryDto })
  public timesheetStatusSummary!: TimesheetStatusSummaryDto;

  @ApiProperty({ type: [ProjectPvaSummaryDto] })
  public projectSummaries!: ProjectPvaSummaryDto[];

  @ApiProperty({ type: [OrgUnitPvaSummaryDto] })
  public orgUnitSummaries!: OrgUnitPvaSummaryDto[];

  @ApiProperty({ type: [ResourcePoolPvaSummaryDto] })
  public resourcePoolSummaries!: ResourcePoolPvaSummaryDto[];

  @ApiProperty({ type: StaffingCoverageDto })
  public staffingCoverage!: StaffingCoverageDto;
}
