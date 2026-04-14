import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BusinessAuditRecordDto {
  @ApiProperty()
  public actionType!: string;

  @ApiPropertyOptional({ nullable: true })
  public actorId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  public actorDisplayName?: string | null;

  @ApiProperty()
  public targetEntityType!: string;

  @ApiPropertyOptional({ nullable: true })
  public targetEntityId?: string | null;

  @ApiProperty()
  public occurredAt!: string;

  @ApiPropertyOptional({ nullable: true })
  public changeSummary?: string | null;

  @ApiProperty()
  public metadata!: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  public correlationId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  public oldValues?: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  public newValues?: Record<string, unknown> | null;
}

export class BusinessAuditResponseDto {
  @ApiProperty({ type: [BusinessAuditRecordDto] })
  public items!: BusinessAuditRecordDto[];

  @ApiProperty()
  public totalCount!: number;

  @ApiProperty()
  public page!: number;

  @ApiProperty()
  public pageSize!: number;
}
