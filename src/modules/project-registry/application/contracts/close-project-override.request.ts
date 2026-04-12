import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class CloseProjectOverrideRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  public expectedProjectVersion?: number;
}
