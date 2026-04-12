import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportingLineResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public managerId!: string;

  @ApiProperty({ enum: ['SOLID'] })
  public type!: 'SOLID';

  @ApiProperty()
  public startDate!: string;

  @ApiPropertyOptional()
  public endDate?: string;
}
