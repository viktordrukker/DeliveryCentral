import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CaseParticipantResponseDto {
  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public role!: string;
}

export class CaseResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public caseNumber!: string;

  @ApiProperty()
  public caseTypeKey!: string;

  @ApiProperty()
  public caseTypeDisplayName!: string;

  @ApiProperty()
  public status!: string;

  @ApiProperty()
  public subjectPersonId!: string;

  @ApiPropertyOptional()
  public subjectPersonName?: string;

  @ApiProperty()
  public ownerPersonId!: string;

  @ApiPropertyOptional()
  public ownerPersonName?: string;

  @ApiPropertyOptional()
  public relatedProjectId?: string;

  @ApiPropertyOptional()
  public relatedAssignmentId?: string;

  @ApiPropertyOptional()
  public summary?: string;

  @ApiProperty()
  public openedAt!: string;

  @ApiPropertyOptional()
  public closedAt?: string;

  @ApiPropertyOptional()
  public cancelReason?: string;

  @ApiProperty({ type: [CaseParticipantResponseDto] })
  public participants!: CaseParticipantResponseDto[];
}

export class ListCasesResponseDto {
  @ApiProperty({ type: [CaseResponseDto] })
  public items!: CaseResponseDto[];

  @ApiProperty()
  public total!: number;

  @ApiProperty()
  public page!: number;

  @ApiProperty()
  public pageSize!: number;
}
