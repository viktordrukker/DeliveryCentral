import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * F-9.2 / 20c-09 — typed body for `POST /org/people/:id/release-requests`.
 * Replaces an inline `@Body() body: { reason: string; reasonCode?: string;
 * targetTerminationDate: string }`.
 */
export class OpenPersonReleaseRequestBodyDto {
  @ApiProperty({ description: 'Required reason for opening the release request.', minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  public reason!: string;

  @ApiPropertyOptional({ description: 'Optional structured reason code (HR taxonomy).' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  public reasonCode?: string;

  @ApiProperty({ description: 'Target termination date in ISO-8601 (YYYY-MM-DD or full datetime).' })
  @IsISO8601()
  public targetTerminationDate!: string;
}
