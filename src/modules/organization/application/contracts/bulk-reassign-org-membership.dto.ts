import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// Permissive UUID-shape regex to match seed pseudo-UUIDs (see PRs #537/#538).
const UUID_SHAPE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BulkReassignOrgMembershipRequestDto {
  @ApiProperty({
    description: 'IDs of people to reassign.',
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @Matches(UUID_SHAPE_RE, { each: true })
  public personIds!: string[];

  @ApiProperty({ description: 'Destination org unit ID.' })
  @IsString()
  @Matches(UUID_SHAPE_RE)
  public toOrgUnitId!: string;

  @ApiProperty({
    description: 'Effective date (ISO-8601). Old memberships close at effectiveFrom - 1 day.',
  })
  @IsISO8601()
  public effectiveFrom!: string;

  @ApiPropertyOptional({ description: 'Optional reason for the reorg.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public reason?: string;
}

export class BulkReassignOrgMembershipResponseDto {
  @ApiProperty({ type: [String] })
  public movedPersonIds!: string[];

  @ApiProperty({ type: [String], description: 'People skipped because they were already in the destination unit.' })
  public skippedPersonIds!: string[];

  @ApiProperty({ type: [String] })
  public newMembershipIds!: string[];
}
