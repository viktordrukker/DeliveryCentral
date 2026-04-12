import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  
  ValidateNested,
  
  
  Matches,
} from 'class-validator';

export class CreateCaseParticipantRequestDto {
  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  public personId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsIn(['APPROVER', 'OBSERVER', 'OPERATOR', 'REVIEWER', 'REQUESTER', 'SUBJECT'])
  public role!: 'APPROVER' | 'OBSERVER' | 'OPERATOR' | 'REVIEWER' | 'REQUESTER' | 'SUBJECT';
}

export class CreateCaseRequestDto {
  @ApiProperty({ enum: ['ONBOARDING', 'OFFBOARDING', 'TRANSFER', 'PERFORMANCE'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ONBOARDING', 'OFFBOARDING', 'TRANSFER', 'PERFORMANCE'])
  public caseTypeKey!: 'OFFBOARDING' | 'ONBOARDING' | 'PERFORMANCE' | 'TRANSFER';

  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  public subjectPersonId!: string;

  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  public ownerPersonId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  public relatedProjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  public relatedAssignmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public summary?: string;

  @ApiPropertyOptional({ type: [CreateCaseParticipantRequestDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCaseParticipantRequestDto)
  public participants?: CreateCaseParticipantRequestDto[];
}
