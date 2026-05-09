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

  // HD-8 / Chunk 8.2 — populated only after a successful CANCEL
  // transition. Pass back to `POST /undo/:id/consume` to roll the
  // assignment back to its prior status.
  @ApiPropertyOptional()
  public undoActionId?: string;
}
