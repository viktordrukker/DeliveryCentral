import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

const VALID_ROLES = ['employee', 'project_manager', 'resource_manager', 'director', 'hr_manager', 'delivery_manager', 'admin'];

export class CreateAccountRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  public displayName!: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  public email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  public personId?: string;

  @ApiProperty({ type: [String], enum: VALID_ROLES })
  @IsArray()
  @IsString({ each: true })
  @IsIn(VALID_ROLES, { each: true })
  public roles!: string[];
}
