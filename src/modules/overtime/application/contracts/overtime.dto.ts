import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/* ── Policy DTOs ── */

export class OvertimePolicyDto {
  @ApiProperty() public id!: string;
  @ApiPropertyOptional() public orgUnitId!: string | null;
  @ApiPropertyOptional() public orgUnitName!: string | null;
  @ApiPropertyOptional() public resourcePoolId!: string | null;
  @ApiPropertyOptional() public resourcePoolName!: string | null;
  @ApiProperty() public standardHoursPerWeek!: number;
  @ApiProperty() public maxOvertimeHoursPerWeek!: number;
  @ApiProperty() public setByPersonId!: string;
  @ApiProperty() public setByDisplayName!: string;
  @ApiProperty() public approvalStatus!: string;
  @ApiProperty() public effectiveFrom!: string;
  @ApiPropertyOptional() public effectiveTo!: string | null;
}

export class CreateOvertimePolicyDto {
  @ApiPropertyOptional() public orgUnitId?: string;
  @ApiPropertyOptional() public resourcePoolId?: string;
  @ApiProperty() public standardHoursPerWeek!: number;
  @ApiProperty() public maxOvertimeHoursPerWeek!: number;
}

/* ── Exception DTOs ── */

export class OvertimeExceptionDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public personId!: string;
  @ApiProperty() public personDisplayName!: string;
  @ApiProperty() public caseRecordId!: string;
  @ApiProperty() public caseNumber!: string;
  @ApiProperty() public maxOvertimeHoursPerWeek!: number;
  @ApiProperty() public reason!: string;
  @ApiProperty() public effectiveFrom!: string;
  @ApiProperty() public effectiveTo!: string;
}

export class CreateOvertimeExceptionDto {
  @ApiProperty() public personId!: string;
  @ApiProperty() public maxOvertimeHoursPerWeek!: number;
  @ApiProperty() public reason!: string;
  @ApiProperty() public effectiveFrom!: string;
  @ApiProperty() public effectiveTo!: string;
}

/* ── Resolved policy ── */

export class ResolvedOvertimePolicyDto {
  @ApiProperty() public standardHoursPerWeek!: number;
  @ApiProperty() public maxOvertimeHoursPerWeek!: number;
  @ApiProperty() public source!: string; // 'exception' | 'pool' | 'department' | 'organization'
  @ApiPropertyOptional() public sourceId!: string | null;
  @ApiPropertyOptional() public sourceName!: string | null;
}

/* ── Summary DTOs (for dashboards) ── */

export class OvertimePersonSummaryDto {
  @ApiProperty() public personId!: string;
  @ApiProperty() public displayName!: string;
  @ApiPropertyOptional() public departmentId!: string | null;
  @ApiPropertyOptional() public departmentName!: string | null;
  @ApiPropertyOptional() public poolId!: string | null;
  @ApiPropertyOptional() public poolName!: string | null;
  @ApiProperty() public totalHours!: number;
  @ApiProperty() public standardHours!: number;
  @ApiProperty() public overtimeHours!: number;
  @ApiProperty() public effectiveThreshold!: number;
  @ApiProperty() public exceedsThreshold!: boolean;
  @ApiProperty() public hasException!: boolean;
  @ApiProperty({ type: [Object] })
  public weekBreakdown!: Array<{ weekStart: string; total: number; standard: number; overtime: number }>;
}

export class OvertimeProjectSummaryDto {
  @ApiProperty() public projectId!: string;
  @ApiProperty() public projectCode!: string;
  @ApiProperty() public projectName!: string;
  @ApiProperty() public overtimeHours!: number;
  @ApiProperty() public contributorCount!: number;
}

export class OvertimeDeptSummaryDto {
  @ApiProperty() public orgUnitId!: string;
  @ApiProperty() public orgUnitName!: string;
  @ApiProperty() public personCount!: number;
  @ApiProperty() public totalOvertimeHours!: number;
  @ApiProperty() public overtimeRate!: number;
  @ApiPropertyOptional() public policyMaxHours!: number | null;
  @ApiProperty() public exceedingPolicyCount!: number;
}

export class OvertimePoolSummaryDto {
  @ApiProperty() public poolId!: string;
  @ApiProperty() public poolName!: string;
  @ApiProperty() public personCount!: number;
  @ApiProperty() public totalOvertimeHours!: number;
  @ApiProperty() public overtimeRate!: number;
  @ApiPropertyOptional() public policyMaxHours!: number | null;
  @ApiProperty() public exceedingPolicyCount!: number;
}

export class PendingOvertimeExceptionDto {
  @ApiProperty() public caseId!: string;
  @ApiProperty() public personId!: string;
  @ApiProperty() public personName!: string;
  @ApiProperty() public requestedMaxHours!: number;
  @ApiProperty() public reason!: string;
  @ApiProperty() public requestedAt!: string;
}

export class OvertimeSummaryResponseDto {
  @ApiProperty() public weekStart!: string;
  @ApiProperty() public weekEnd!: string;
  @ApiProperty() public weeksIncluded!: number;
  @ApiProperty() public totalOvertimeHours!: number;
  @ApiProperty() public totalStandardHours!: number;
  @ApiProperty() public overtimeRate!: number;
  @ApiProperty() public peopleWithOvertime!: number;
  @ApiProperty() public peopleExceedingCap!: number;
  @ApiProperty({ type: [OvertimePersonSummaryDto] }) public personSummaries!: OvertimePersonSummaryDto[];
  @ApiProperty({ type: [OvertimeProjectSummaryDto] }) public projectSummaries!: OvertimeProjectSummaryDto[];
  @ApiProperty({ type: [OvertimeDeptSummaryDto] }) public departmentSummaries!: OvertimeDeptSummaryDto[];
  @ApiProperty({ type: [OvertimePoolSummaryDto] }) public poolSummaries!: OvertimePoolSummaryDto[];
  @ApiProperty({ type: [PendingOvertimeExceptionDto] }) public pendingExceptions!: PendingOvertimeExceptionDto[];
}
