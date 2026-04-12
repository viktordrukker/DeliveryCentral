import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProjectAssignmentResponseDto } from './project-assignment.response';

export class BulkProjectAssignmentCreatedItemDto {
  @ApiProperty()
  public index!: number;

  @ApiProperty({ type: ProjectAssignmentResponseDto })
  public assignment!: ProjectAssignmentResponseDto;
}

export class BulkProjectAssignmentFailedItemDto {
  @ApiProperty()
  public index!: number;

  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public projectId!: string;

  @ApiProperty()
  public staffingRole!: string;

  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public message!: string;
}

export class BulkProjectAssignmentResponseDto {
  @ApiProperty({ example: 'PARTIAL_SUCCESS' })
  public strategy!: 'PARTIAL_SUCCESS';

  @ApiProperty()
  public totalCount!: number;

  @ApiProperty()
  public createdCount!: number;

  @ApiProperty()
  public failedCount!: number;

  @ApiProperty({ type: [BulkProjectAssignmentCreatedItemDto] })
  public createdItems!: BulkProjectAssignmentCreatedItemDto[];

  @ApiProperty({ type: [BulkProjectAssignmentFailedItemDto] })
  public failedItems!: BulkProjectAssignmentFailedItemDto[];

  @ApiPropertyOptional()
  public message?: string;
}
