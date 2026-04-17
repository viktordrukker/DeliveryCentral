import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddCaseStepRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public stepKey?: string;
}
