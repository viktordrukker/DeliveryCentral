import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * NEW-LGL-3 — request bodies for /admin/custom-roles CRUD.
 *
 * `roleKey` is a stable slug (3-64 chars, lowercase letters/digits/_,
 * must start with a letter and end with a letter or digit). Service
 * layer rejects reserved PlatformRole keys.
 * `inheritedRoles` is a non-empty list of built-in PlatformRole values
 * the custom role expands to; service layer rejects unknown roles.
 */

const ROLE_KEY_REGEX = /^[a-z][a-z0-9_]{1,62}[a-z0-9]$/;

export class CreateCustomRoleBodyDto {
  @ApiProperty({ description: 'Stable slug, e.g. "squad_lead".' })
  @IsString()
  @Matches(ROLE_KEY_REGEX, { message: 'roleKey must be a 3-64 char lowercase slug' })
  roleKey!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiProperty({ type: [String], description: 'Built-in PlatformRole values the custom role inherits.' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  inheritedRoles!: string[];
}

export class UpdateCustomRoleBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  inheritedRoles?: string[];
}
