import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDictionaryEntryRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public entryKey!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public entryValue!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  public sortOrder?: number;
}
