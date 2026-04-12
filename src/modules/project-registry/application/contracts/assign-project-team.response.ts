import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeamAssignmentCreatedItemDto {
  @ApiProperty()
  public assignmentId!: string;

  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public personName!: string;
}

export class TeamAssignmentSkippedItemDto {
  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public personName!: string;

  @ApiProperty()
  public reason!: string;
}

export class AssignProjectTeamResponseDto {
  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public teamOrgUnitId!: string;

  @ApiProperty()
  public teamName!: string;

  @ApiProperty()
  public createdCount!: number;

  @ApiProperty()
  public skippedDuplicateCount!: number;

  @ApiProperty({ type: TeamAssignmentCreatedItemDto, isArray: true })
  public createdAssignments!: TeamAssignmentCreatedItemDto[];

  @ApiProperty({ type: TeamAssignmentSkippedItemDto, isArray: true })
  public skippedDuplicates!: TeamAssignmentSkippedItemDto[];

  @ApiProperty()
  public staffingRole!: string;

  @ApiProperty()
  public allocationPercent!: number;

  @ApiProperty()
  public startDate!: string;

  @ApiPropertyOptional()
  public endDate?: string;
}
