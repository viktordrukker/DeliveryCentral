import { ApiProperty } from '@nestjs/swagger';

class WeeklyTrendPointDto {
  @ApiProperty()
  public weekStarting!: string;

  @ApiProperty()
  public activeProjectCount!: number;

  @ApiProperty()
  public staffedPersonCount!: number;

  @ApiProperty()
  public evidenceCoverageRate!: number;
}

class DirectorDashboardSummaryDto {
  @ApiProperty()
  public activeProjectCount!: number;

  @ApiProperty()
  public activeAssignmentCount!: number;

  @ApiProperty()
  public staffedPersonCount!: number;

  @ApiProperty()
  public unstaffedActivePersonCount!: number;

  @ApiProperty()
  public evidenceCoverageRate!: number;
}

class UnitUtilisationItemDto {
  @ApiProperty()
  public orgUnitId!: string;

  @ApiProperty()
  public orgUnitName!: string;

  @ApiProperty()
  public memberCount!: number;

  @ApiProperty()
  public staffedCount!: number;

  @ApiProperty()
  public utilisation!: number;
}

export class DirectorDashboardResponseDto {
  @ApiProperty()
  public asOf!: string;

  @ApiProperty({ type: () => DirectorDashboardSummaryDto })
  public summary!: DirectorDashboardSummaryDto;

  @ApiProperty({ type: () => [UnitUtilisationItemDto] })
  public unitUtilisation!: UnitUtilisationItemDto[];

  @ApiProperty({ type: [String] })
  public dataSources!: string[];

  @ApiProperty({ type: () => [WeeklyTrendPointDto] })
  public weeklyTrend!: WeeklyTrendPointDto[];
}
