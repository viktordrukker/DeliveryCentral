import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ImportRowDto {
  @ApiProperty()
  @IsEmail()
  public email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public familyName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public givenName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public grade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public role?: string;
}

export class ImportConfirmRequestDto {
  @ApiProperty({ type: [ImportRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  public rows!: ImportRowDto[];
}
