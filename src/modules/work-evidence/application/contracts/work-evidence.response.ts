import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkEvidenceResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiPropertyOptional()
  public personId?: string;

  @ApiPropertyOptional()
  public projectId?: string;

  @ApiProperty()
  public sourceType!: string;

  @ApiProperty()
  public sourceRecordKey!: string;

  @ApiProperty()
  public recordedAt!: string;

  @ApiProperty()
  public activityDate!: string;

  @ApiProperty()
  public effortHours!: number;

  @ApiPropertyOptional()
  public summary?: string;

  @ApiPropertyOptional()
  public details?: Record<string, unknown>;

  @ApiPropertyOptional()
  public trace?: Record<string, unknown>;
}

export class ListWorkEvidenceResponseDto {
  @ApiProperty({ type: [WorkEvidenceResponseDto] })
  public items!: WorkEvidenceResponseDto[];
}
