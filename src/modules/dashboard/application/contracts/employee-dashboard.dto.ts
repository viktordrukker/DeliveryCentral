import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AssignmentDirectoryItemDto } from '@src/modules/assignments/application/contracts/assignment-directory.dto';
import { WorkEvidenceResponseDto } from '@src/modules/work-evidence/application/contracts/work-evidence.response';

class EmployeeDashboardPersonSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty({ nullable: true })
  public primaryEmail!: string | null;

  @ApiProperty({
    nullable: true,
    required: false,
    type: Object,
  })
  public currentOrgUnit!:
    | {
        code: string;
        id: string;
        name: string;
      }
    | null;

  @ApiProperty({
    nullable: true,
    required: false,
    type: Object,
  })
  public currentLineManager!:
    | {
        displayName: string;
        id: string;
      }
    | null;
}

class EmployeeCurrentWorkloadSummaryDto {
  @ApiProperty()
  public activeAssignmentCount!: number;

  @ApiProperty()
  public futureAssignmentCount!: number;

  @ApiProperty()
  public pendingSelfWorkflowItemCount!: number;

  @ApiProperty()
  public totalAllocationPercent!: number;

  @ApiProperty()
  public isOverallocated!: boolean;
}

class EmployeeRecentWorkEvidenceSummaryDto {
  @ApiProperty()
  public recentEntryCount!: number;

  @ApiProperty()
  public totalEffortHours!: number;

  @ApiProperty({ nullable: true })
  public lastActivityDate!: string | null;

  @ApiProperty({ type: [String] })
  public sourceTypes!: string[];

  @ApiProperty({ type: () => [WorkEvidenceResponseDto] })
  public recentItems!: WorkEvidenceResponseDto[];
}

class EmployeePendingWorkflowItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public title!: string;

  @ApiPropertyOptional()
  public detail?: string;
}

class EmployeePendingWorkflowSummaryDto {
  @ApiProperty()
  public itemCount!: number;

  @ApiProperty({ type: () => [EmployeePendingWorkflowItemDto] })
  public items!: EmployeePendingWorkflowItemDto[];
}

class EmployeeNotificationsSummaryDto {
  @ApiProperty()
  public status!: string;

  @ApiProperty()
  public pendingCount!: number;

  @ApiProperty()
  public note!: string;
}

export class EmployeeDashboardResponseDto {
  @ApiProperty()
  public asOf!: string;

  @ApiProperty({ type: () => EmployeeDashboardPersonSummaryDto })
  public person!: EmployeeDashboardPersonSummaryDto;

  @ApiProperty({ type: () => [AssignmentDirectoryItemDto] })
  public currentAssignments!: AssignmentDirectoryItemDto[];

  @ApiProperty({ type: () => [AssignmentDirectoryItemDto] })
  public futureAssignments!: AssignmentDirectoryItemDto[];

  @ApiProperty({ type: () => EmployeeCurrentWorkloadSummaryDto })
  public currentWorkloadSummary!: EmployeeCurrentWorkloadSummaryDto;

  @ApiProperty({ type: () => EmployeeRecentWorkEvidenceSummaryDto })
  public recentWorkEvidenceSummary!: EmployeeRecentWorkEvidenceSummaryDto;

  @ApiProperty({ type: () => EmployeePendingWorkflowSummaryDto })
  public pendingWorkflowItems!: EmployeePendingWorkflowSummaryDto;

  @ApiProperty({ type: () => EmployeeNotificationsSummaryDto })
  public notificationsSummary!: EmployeeNotificationsSummaryDto;

  @ApiProperty({ type: [String] })
  public dataSources!: string[];
}
