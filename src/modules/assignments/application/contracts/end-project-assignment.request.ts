import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  
  IsDateString,
  
  
  Matches,
} from 'class-validator';

export class EndProjectAssignmentRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  public actorId?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  public endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public reason?: string;
}
