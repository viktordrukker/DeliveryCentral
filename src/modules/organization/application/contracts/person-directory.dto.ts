import { ApiProperty } from '@nestjs/swagger';

class PersonSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;
}

class ResourcePoolSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public name!: string;
}

class OrgUnitSummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public name!: string;
}

export class PersonDirectoryItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public primaryEmail!: string | null;

  @ApiProperty({ type: OrgUnitSummaryDto, nullable: true })
  public currentOrgUnit!: OrgUnitSummaryDto | null;

  @ApiProperty({ type: PersonSummaryDto, nullable: true })
  public currentLineManager!: PersonSummaryDto | null;

  @ApiProperty({ type: [PersonSummaryDto] })
  public dottedLineManagers!: PersonSummaryDto[];

  @ApiProperty()
  public currentAssignmentCount!: number;

  @ApiProperty({ nullable: true })
  public grade!: string | null;

  @ApiProperty({ nullable: true })
  public hiredAt!: string | null;

  @ApiProperty()
  public lifecycleStatus!: string;

  @ApiProperty({ nullable: true })
  public role!: string | null;

  @ApiProperty({ nullable: true })
  public terminatedAt!: string | null;

  @ApiProperty({ type: [String] })
  public resourcePoolIds!: string[];

  @ApiProperty({ type: [ResourcePoolSummaryDto] })
  public resourcePools!: ResourcePoolSummaryDto[];
}

export class PaginatedPersonDirectoryResponseDto {
  @ApiProperty({ type: [PersonDirectoryItemDto] })
  public items!: PersonDirectoryItemDto[];

  @ApiProperty()
  public page!: number;

  @ApiProperty()
  public pageSize!: number;

  @ApiProperty()
  public total!: number;
}
