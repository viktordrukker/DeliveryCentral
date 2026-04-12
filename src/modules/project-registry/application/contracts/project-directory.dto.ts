import { ApiProperty } from '@nestjs/swagger';

export class ProjectExternalLinkSummaryDto {
  @ApiProperty()
  public provider!: string;

  @ApiProperty()
  public count!: number;
}

export class ProjectExternalLinkDto {
  @ApiProperty()
  public provider!: string;

  @ApiProperty()
  public externalProjectKey!: string;

  @ApiProperty()
  public externalProjectName!: string;

  @ApiProperty({ required: false, nullable: true })
  public externalUrl!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public providerEnvironment!: string | null;

  @ApiProperty()
  public archived!: boolean;
}

export class ProjectDirectoryItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public status!: string;

  @ApiProperty()
  public version!: number;

  @ApiProperty()
  public assignmentCount!: number;

  @ApiProperty()
  public externalLinksCount!: number;

  @ApiProperty({ type: [ProjectExternalLinkSummaryDto] })
  public externalLinksSummary!: ProjectExternalLinkSummaryDto[];
}

export class ProjectDirectoryResponseDto {
  @ApiProperty({ type: [ProjectDirectoryItemDto] })
  public items!: ProjectDirectoryItemDto[];
}

export class ProjectDetailsDto extends ProjectDirectoryItemDto {
  @ApiProperty({ required: false, nullable: true })
  public description!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public startDate!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public plannedEndDate!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public projectManagerId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public projectManagerDisplayName!: string | null;

  @ApiProperty({ type: [ProjectExternalLinkDto] })
  public externalLinks!: ProjectExternalLinkDto[];
}
