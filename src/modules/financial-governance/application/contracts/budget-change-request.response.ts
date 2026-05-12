import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * F-3.1 / D-92 — pending budget change request shape returned by
 * `GET /api/projects/:id/budget-change-requests`.
 *
 * Carries the BudgetApproval UUID as `id` plus the request payload.
 * `publicId` is null today because the BudgetApproval model does not
 * yet have a publicId column — when one is added the column flips to
 * a populated string and the no-UUIDs-in-browser rule applies to
 * downstream FE code.
 */
export class BudgetChangeRequestDto {
  @ApiProperty({ description: 'Budget approval id (UUID until BudgetApproval grows a publicId).' })
  public id!: string;

  @ApiPropertyOptional({ description: 'Public opaque id (null until BudgetApproval has a publicId column).', nullable: true })
  public publicId!: string | null;

  @ApiProperty({ description: 'Parent ProjectBudget id.' })
  public projectBudgetId!: string;

  @ApiProperty({ description: 'Approval status (PENDING / APPROVED / REJECTED).' })
  public status!: string;

  @ApiProperty({ description: 'Person who requested the change.' })
  public requestedByPersonId!: string;

  @ApiProperty({ description: 'When the request was made (ISO-8601).' })
  public requestedAt!: string;

  @ApiPropertyOptional({ description: 'Requested new capex / opex.', nullable: true })
  public requestedChange!: { capexBudget: number; opexBudget: number } | null;

  @ApiPropertyOptional({ description: 'Person who decided (after director decision).', nullable: true })
  public decidedByPersonId!: string | null;

  @ApiPropertyOptional({ description: 'When the decision was made (ISO-8601).', nullable: true })
  public decisionAt!: string | null;

  @ApiPropertyOptional({ description: 'Optional decision rationale.', nullable: true })
  public decisionReason!: string | null;
}
