import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitPulseDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  mood!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class PulseEntryDto {
  id!: string;
  personId!: string;
  weekStart!: string;
  mood!: number;
  note?: string;
  submittedAt!: string;
}

export class PulseHistoryDto {
  entries!: PulseEntryDto[];
  frequency!: string;
}
