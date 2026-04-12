import { ApiProperty } from '@nestjs/swagger';

export class ResourcePoolMemberDto {
  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public validFrom!: string;
}

export class ResourcePoolDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty({ nullable: true })
  public description!: string | null;

  @ApiProperty({ nullable: true })
  public orgUnitId!: string | null;

  @ApiProperty({ type: [ResourcePoolMemberDto] })
  public members!: ResourcePoolMemberDto[];
}

export class ResourcePoolListDto {
  @ApiProperty({ type: [ResourcePoolDto] })
  public items!: ResourcePoolDto[];
}
