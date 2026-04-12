import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  
  IsDateString,
  
  
  Matches,
} from 'class-validator';

export class CreateProjectRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public description?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  public startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  public plannedEndDate?: string;

  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public projectManagerId!: string;
}
