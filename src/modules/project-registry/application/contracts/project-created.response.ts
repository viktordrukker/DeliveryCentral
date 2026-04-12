import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectCreatedResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public name!: string;

  @ApiPropertyOptional()
  public description?: string;

  @ApiProperty()
  public status!: string;

  @ApiProperty()
  public startDate!: string;

  @ApiPropertyOptional()
  public plannedEndDate?: string;

  @ApiProperty()
  public projectManagerId!: string;

  @ApiProperty()
  public version!: number;
}
