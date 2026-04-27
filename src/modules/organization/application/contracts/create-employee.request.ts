import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateEmployeeRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public name!: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254) // EMAIL-01 — RFC 5321 maximum email address length.
  public email!: string;

  @ApiPropertyOptional({
    description: 'Defaults to INACTIVE when omitted.',
    enum: ['ACTIVE', 'INACTIVE'],
  })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'] as const)
  public status?: 'ACTIVE' | 'INACTIVE';

  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public orgUnitId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public grade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public role?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public skillsets?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public jobTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  public hireDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  public lineManagerId?: string;
}
