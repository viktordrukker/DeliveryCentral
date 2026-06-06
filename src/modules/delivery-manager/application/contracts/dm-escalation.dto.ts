import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

import { DmEscalationSourceKind } from '../dm-escalation.service';

// Permissive UUID-shape regex per Rule 6 — accepts seed pseudo-UUIDs as
// well as fully-random ones. Same pattern the project-positions DTOs use.
const UUID_SHAPE_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const DM_ESCALATION_SOURCE_KINDS = ['timesheet', 'work-hour', 'milestone', 'leave'] as const;

export class CreateDmEscalationDto {
  @ApiProperty({ enum: DM_ESCALATION_SOURCE_KINDS })
  @IsIn(DM_ESCALATION_SOURCE_KINDS as unknown as string[])
  public sourceKind!: DmEscalationSourceKind;

  @ApiProperty()
  @Matches(UUID_SHAPE_REGEX, { message: '$property must be a UUID-shaped string' })
  public sourceId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  public reason!: string;

  @ApiPropertyOptional({ description: 'Optional Director to direct the escalation to.' })
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: '$property must be a UUID-shaped string' })
  public escalatedToPersonId?: string;
}

export class ResolveDmEscalationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public notes?: string;
}

export class DmEscalationResponseDto {
  @ApiProperty() public id!: string;
  @ApiPropertyOptional() public publicId!: string | null;
  @ApiProperty({ enum: DM_ESCALATION_SOURCE_KINDS }) public sourceKind!: DmEscalationSourceKind;
  @ApiProperty() public sourceId!: string;
  @ApiProperty() public reason!: string;
  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'OVERRIDDEN', 'CANCELLED'] })
  public status!: 'PENDING' | 'CONFIRMED' | 'OVERRIDDEN' | 'CANCELLED';
  @ApiProperty() public escalatedByPersonId!: string;
  @ApiPropertyOptional() public escalatedByDisplayName!: string | null;
  @ApiPropertyOptional() public escalatedToPersonId!: string | null;
  @ApiPropertyOptional() public escalatedToDisplayName!: string | null;
  @ApiPropertyOptional() public resolvedAt!: string | null;
  @ApiPropertyOptional() public resolvedByPersonId!: string | null;
  @ApiPropertyOptional() public resolvedByDisplayName!: string | null;
  @ApiPropertyOptional() public resolutionNotes!: string | null;
  @ApiProperty() public createdAt!: string;
  @ApiProperty() public updatedAt!: string;
}
