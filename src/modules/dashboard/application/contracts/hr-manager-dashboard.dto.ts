import { ApiProperty } from '@nestjs/swagger';

class HrManagerDashboardPersonSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty({ nullable: true })
  public primaryEmail!: string | null;
}

class HrCountSummaryDto {
  @ApiProperty()
  public totalHeadcount!: number;

  @ApiProperty()
  public activeHeadcount!: number;

  @ApiProperty()
  public inactiveHeadcount!: number;
}

class HrDistributionItemDto {
  @ApiProperty()
  public key!: string;

  @ApiProperty()
  public label!: string;

  @ApiProperty()
  public count!: number;
}

class HrPersonAttentionItemDto {
  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty({ nullable: true })
  public primaryEmail!: string | null;

  @ApiProperty()
  public reason!: string;
}

class HrLifecycleActivityItemDto {
  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public activityType!: string;

  @ApiProperty()
  public occurredAt!: string;
}

class AtRiskEmployeeDto {
  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty({ nullable: true })
  public primaryEmail!: string | null;

  @ApiProperty({ type: [String] })
  public riskFactors!: string[];
}

export class HrManagerDashboardResponseDto {
  @ApiProperty()
  public asOf!: string;

  @ApiProperty({ type: () => HrManagerDashboardPersonSummaryDto })
  public person!: HrManagerDashboardPersonSummaryDto;

  @ApiProperty({ type: () => HrCountSummaryDto })
  public headcountSummary!: HrCountSummaryDto;

  @ApiProperty({ type: () => [HrDistributionItemDto] })
  public orgDistribution!: HrDistributionItemDto[];

  @ApiProperty({ type: () => [HrDistributionItemDto] })
  public gradeDistribution!: HrDistributionItemDto[];

  @ApiProperty({ type: () => [HrDistributionItemDto] })
  public roleDistribution!: HrDistributionItemDto[];

  @ApiProperty({ type: () => [HrPersonAttentionItemDto] })
  public employeesWithoutManager!: HrPersonAttentionItemDto[];

  @ApiProperty({ type: () => [HrPersonAttentionItemDto] })
  public employeesWithoutOrgUnit!: HrPersonAttentionItemDto[];

  @ApiProperty({ type: () => [HrLifecycleActivityItemDto] })
  public recentJoinerActivity!: HrLifecycleActivityItemDto[];

  @ApiProperty({ type: () => [HrLifecycleActivityItemDto] })
  public recentDeactivationActivity!: HrLifecycleActivityItemDto[];

  @ApiProperty({ type: () => [AtRiskEmployeeDto] })
  public atRiskEmployees!: AtRiskEmployeeDto[];

  @ApiProperty({ type: [String] })
  public dataSources!: string[];
}
