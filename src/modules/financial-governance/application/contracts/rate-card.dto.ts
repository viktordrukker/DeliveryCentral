import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// HD-3 admin DTOs. Two resources: RateCard (parent) + RateCardEntry (child).
// Cards carry currency / scope / validity window; entries carry the
// (role, grade, optional required skills) → hourly rate match keys.

export class RateCardEntryResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public rateCardId!: string;

  @ApiProperty()
  public staffingRole!: string;

  @ApiProperty()
  public grade!: string;

  @ApiProperty({ type: [String] })
  public requiredSkills!: string[];

  @ApiProperty({ description: 'Hourly bill rate in the parent card currency.' })
  public hourlyRate!: number;

  @ApiPropertyOptional()
  public notes!: string | null;

  @ApiProperty()
  public isActive!: boolean;

  @ApiProperty()
  public createdAt!: string;

  @ApiProperty()
  public updatedAt!: string;

  @ApiPropertyOptional()
  public archivedAt!: string | null;

  // Number of project assignments currently pinned to this entry — useful
  // signal for admins before they archive it.
  @ApiProperty()
  public pinnedAssignmentCount!: number;
}

export class RateCardResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty({ description: 'ISO-4217 3-letter currency code.' })
  public currencyCode!: string;

  @ApiPropertyOptional({ description: 'NULL = tenant default; otherwise client-scoped.' })
  public clientId!: string | null;

  @ApiPropertyOptional({ description: "Convenience: client name when clientId is set." })
  public clientName!: string | null;

  @ApiProperty()
  public validFrom!: string;

  @ApiPropertyOptional()
  public validTo!: string | null;

  @ApiProperty()
  public isActive!: boolean;

  @ApiPropertyOptional()
  public notes!: string | null;

  @ApiPropertyOptional()
  public tenantId!: string | null;

  @ApiProperty()
  public createdAt!: string;

  @ApiProperty()
  public updatedAt!: string;

  @ApiPropertyOptional()
  public archivedAt!: string | null;

  @ApiProperty()
  public entryCount!: number;
}

export class RateCardWithEntriesResponseDto extends RateCardResponseDto {
  @ApiProperty({ type: [RateCardEntryResponseDto] })
  public entries!: RateCardEntryResponseDto[];
}

export class CreateRateCardDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  public name!: string;

  @ApiProperty()
  @IsString()
  @Length(3, 3)
  public currencyCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(UUID_SHAPE)
  public clientId?: string | null;

  @ApiProperty({ description: 'ISO date YYYY-MM-DD.' })
  @IsDateString()
  public validFrom!: string;

  @ApiPropertyOptional({ description: 'ISO date YYYY-MM-DD; NULL = open-ended.' })
  @IsOptional()
  @IsDateString()
  public validTo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(UUID_SHAPE)
  public tenantId?: string | null;
}

export class UpdateRateCardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  public name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  public validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  public validTo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public notes?: string | null;
}

export class CreateRateCardEntryDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  public staffingRole!: string;

  @ApiProperty({ description: 'Grade key from tenant grade dictionary.' })
  @IsString()
  @Length(1, 50)
  public grade!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  public requiredSkills?: string[];

  @ApiProperty({ description: 'Hourly bill rate in card currency.' })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  public hourlyRate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public notes?: string;
}

export class UpdateRateCardEntryDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  public requiredSkills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  public hourlyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public notes?: string | null;
}
