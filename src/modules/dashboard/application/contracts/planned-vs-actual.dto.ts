import { ApiProperty } from '@nestjs/swagger';

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

export class PlannedVsActualResponseDto {
  @ApiProperty()
  public asOf!: string;

  @ApiProperty({ type: [AssignedWithoutEvidenceDto] })
  public assignedButNoEvidence!: AssignedWithoutEvidenceDto[];

  @ApiProperty({ type: [EvidenceWithoutApprovedAssignmentDto] })
  public evidenceButNoApprovedAssignment!: EvidenceWithoutApprovedAssignmentDto[];

  @ApiProperty({ type: [MatchedRecordDto] })
  public matchedRecords!: MatchedRecordDto[];

  @ApiProperty({ type: [ComparisonAnomalyDto] })
  public anomalies!: ComparisonAnomalyDto[];
}
