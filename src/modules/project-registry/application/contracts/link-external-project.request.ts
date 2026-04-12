import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  
  
  
  Matches,
} from 'class-validator';

export class LinkExternalProjectRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public connectionKey?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public externalProjectKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public externalProjectName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public externalUrl?: string;

  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public providerEnvironment?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public systemType!: string;
}
