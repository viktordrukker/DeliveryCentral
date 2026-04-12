import { ApiProperty } from '@nestjs/swagger';

class OrgChartPersonSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty({ nullable: true })
  public lineManagerId!: string | null;

  @ApiProperty({ nullable: true })
  public lineManagerName!: string | null;
}

export class OrgChartNodeDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty()
  public kind!: string;

  @ApiProperty({ type: OrgChartPersonSummaryDto, nullable: true })
  public manager!: OrgChartPersonSummaryDto | null;

  @ApiProperty({ type: [OrgChartPersonSummaryDto] })
  public members!: OrgChartPersonSummaryDto[];

  @ApiProperty({ type: [OrgChartNodeDto] })
  public children!: OrgChartNodeDto[];
}

export class DottedLineRelationshipDto {
  @ApiProperty({ type: OrgChartPersonSummaryDto })
  public person!: OrgChartPersonSummaryDto;

  @ApiProperty({ type: [OrgChartPersonSummaryDto] })
  public managers!: OrgChartPersonSummaryDto[];
}

export class OrgChartResponseDto {
  @ApiProperty({ type: [OrgChartNodeDto] })
  public roots!: OrgChartNodeDto[];

  @ApiProperty({ type: [DottedLineRelationshipDto] })
  public dottedLineRelationships!: DottedLineRelationshipDto[];
}
