import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * F-9.2 / 20c-09 — shared body DTO for endpoints that accept an optional
 * free-text `reason` (close/cancel/restore/decline flows). Replaces inline
 * `@Body() body: { reason?: string }` shapes so Swagger picks up the
 * schema and class-validator enforces length bounds.
 */
export class OptionalReasonBodyDto {
  @ApiPropertyOptional({ description: 'Free-text reason for the action.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public reason?: string;
}

/**
 * F-9.2 / 20c-09 — shared body DTO for endpoints that require a reason
 * (reject/decline/cancel-with-reason).
 */
export class RequiredReasonBodyDto {
  @ApiProperty({ description: 'Reason for the action.', minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  public reason!: string;
}
