import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationQueueItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public recipient!: string;

  @ApiProperty()
  public eventName!: string;

  @ApiProperty()
  public templateId!: string;

  @ApiProperty()
  public channelId!: string;

  @ApiProperty({ enum: ['QUEUED', 'RETRYING', 'SENT', 'FAILED_TERMINAL'] })
  public status!: string;

  @ApiProperty()
  public attemptCount!: number;

  @ApiProperty()
  public maxAttempts!: number;

  @ApiProperty()
  public requestedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  public deliveredAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  public nextAttemptAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  public failureReason?: string | null;

  @ApiProperty()
  public payload!: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  public latestRenderedBody?: string | null;
}

export class NotificationQueueResponseDto {
  @ApiProperty({ type: [NotificationQueueItemDto] })
  public items!: NotificationQueueItemDto[];

  @ApiProperty()
  public totalCount!: number;

  @ApiProperty()
  public page!: number;

  @ApiProperty()
  public pageSize!: number;
}
