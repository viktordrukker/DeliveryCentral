import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Matches, Min } from 'class-validator';

export class CreateWorkEvidenceRequestDto {
  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  public personId!: string;

  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  public projectId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public sourceType!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public sourceRecordKey!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public recordedAt!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  public effortHours!: number;

  @ApiPropertyOptional()
  public summary?: string;

  @ApiPropertyOptional()
  public details?: Record<string, unknown>;

  @ApiPropertyOptional()
  public trace?: Record<string, unknown>;
}
