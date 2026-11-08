import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// SoT PR 14b — assignment-directory item is now sourced from the canonical
// `ProjectPosition` aggregate and lives in the dashboard module.
import { PositionDirectoryItemDto } from './position-directory-item.dto';

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

  @ApiProperty({ type: () => [PositionDirectoryItemDto] })
  public currentAssignments!: PositionDirectoryItemDto[];

  @ApiProperty({ type: () => [PositionDirectoryItemDto] })
  public futureAssignments!: PositionDirectoryItemDto[];

  @ApiProperty({ type: () => EmployeeCurrentWorkloadSummaryDto })
  public currentWorkloadSummary!: EmployeeCurrentWorkloadSummaryDto;

  @ApiProperty({ type: () => EmployeePendingWorkflowSummaryDto })
  public pendingWorkflowItems!: EmployeePendingWorkflowSummaryDto;

  @ApiProperty({ type: () => EmployeeNotificationsSummaryDto })
  public notificationsSummary!: EmployeeNotificationsSummaryDto;

  @ApiProperty({ type: [String] })
  public dataSources!: string[];
}
