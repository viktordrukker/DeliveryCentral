import { ApiProperty } from '@nestjs/swagger';

export class RoleDashboardCardDto {
  @ApiProperty()
  public key!: string;

  @ApiProperty()
  public label!: string;

  @ApiProperty()
  public value!: number;
}

export class RoleDashboardItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public title!: string;

  @ApiProperty({ required: false })
  public subtitle?: string;

  @ApiProperty({ required: false })
  public detail?: string;
}

export class RoleDashboardSectionDto {
  @ApiProperty()
  public key!: string;

  @ApiProperty()
  public title!: string;

  @ApiProperty()
  public itemCount!: number;

  @ApiProperty({ type: () => [RoleDashboardItemDto] })
  public items!: RoleDashboardItemDto[];
}

export class RoleDashboardResponseDto {
  @ApiProperty()
  public role!: string;

  @ApiProperty()
  public asOf!: string;

  @ApiProperty({ type: () => [RoleDashboardCardDto] })
  public summaryCards!: RoleDashboardCardDto[];

  @ApiProperty({ type: () => [RoleDashboardSectionDto] })
  public sections!: RoleDashboardSectionDto[];

  @ApiProperty({ type: () => [String] })
  public dataSources!: string[];
}
