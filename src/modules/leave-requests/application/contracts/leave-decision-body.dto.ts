import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Track B.1 — body DTO for the manager approve / reject endpoints.
 *
 * `reviewComment` is the reviewer's free-text justification surfaced in the
 * audit trail and Leave Decision Drawer. Optional on both approve and
 * reject so the controllers can accept the same shape; whitespace-only
 * values are normalised to NULL inside the service.
 */
export class LeaveDecisionBodyDto {
  @ApiPropertyOptional({
    description: 'Reviewer comment (free text, max 1000 chars). Trimmed; empty → null.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewComment?: string;
}
