import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectAssignmentResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public staffingRole!: string;

  @ApiProperty()
  public allocationPercent!: number;

  @ApiProperty()
  public startDate!: string;

  @ApiPropertyOptional()
  public endDate?: string;

  @ApiProperty()
  public status!: string;

  @ApiProperty()
  public requestedAt!: string;

  @ApiProperty()
  public version!: number;

  @ApiPropertyOptional()
  public note?: string;
}
