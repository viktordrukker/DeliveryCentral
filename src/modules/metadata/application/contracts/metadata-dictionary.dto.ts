import { ApiProperty } from '@nestjs/swagger';

export class MetadataDictionarySummaryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public dictionaryKey!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty({ required: false })
  public description?: string;

  @ApiProperty()
  public entityType!: string;

  @ApiProperty({ nullable: true, required: false })
  public scopeOrgUnitId?: string | null;

  @ApiProperty()
  public isSystemManaged!: boolean;

  @ApiProperty()
  public isArchived!: boolean;

  @ApiProperty()
  public entryCount!: number;

  @ApiProperty()
  public enabledEntryCount!: number;

  @ApiProperty()
  public relatedCustomFieldCount!: number;

  @ApiProperty()
  public workflowUsageCount!: number;
}

export class MetadataDictionaryEntryDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public entryKey!: string;

  @ApiProperty()
  public entryValue!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public sortOrder!: number;

  @ApiProperty()
  public isEnabled!: boolean;

  @ApiProperty({ nullable: true, required: false })
  public archivedAt?: string | null;
}

export class RelatedCustomFieldDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public fieldKey!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public entityType!: string;

  @ApiProperty()
  public dataType!: string;

  @ApiProperty()
  public isRequired!: boolean;
}

export class RelatedWorkflowDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public workflowKey!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public entityType!: string;

  @ApiProperty()
  public version!: number;

  @ApiProperty()
  public status!: string;
}

export class RelatedLayoutDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public layoutKey!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty()
  public entityType!: string;

  @ApiProperty()
  public version!: number;

  @ApiProperty()
  public isDefault!: boolean;
}

export class MetadataDictionaryDetailsDto extends MetadataDictionarySummaryDto {
  @ApiProperty({ type: () => [MetadataDictionaryEntryDto] })
  public entries!: MetadataDictionaryEntryDto[];

  @ApiProperty({ type: () => [RelatedCustomFieldDto] })
  public relatedCustomFields!: RelatedCustomFieldDto[];

  @ApiProperty({ type: () => [RelatedWorkflowDto] })
  public relatedWorkflows!: RelatedWorkflowDto[];

  @ApiProperty({ type: () => [RelatedLayoutDto] })
  public relatedLayouts!: RelatedLayoutDto[];
}

export class MetadataDictionaryListResponseDto {
  @ApiProperty({ type: () => [MetadataDictionarySummaryDto] })
  public items!: MetadataDictionarySummaryDto[];
}
