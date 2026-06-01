import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Sources accepted by POST /approvals/:id/decision. Superset of
 * `ApprovalQueueSource` because the unified endpoint also routes timesheet
 * weekly approvals even though they are not surfaced in the queue today.
 */
export type UnifiedApprovalDecisionSource =
  | 'position-proposal'
  | 'budget'
  | 'activation'
  | 'leave'
  | 'case'
  | 'skill-review'
  | 'timesheet';

const APPROVAL_SOURCES: UnifiedApprovalDecisionSource[] = [
  'position-proposal',
  'budget',
  'activation',
  'leave',
  'case',
  'skill-review',
  'timesheet',
];

/**
 * V2 Scope §4 — body DTO for POST /approvals/:id/decision.
 *
 * Unified shape that routes by `source` into the per-source decision service.
 * `comment` is the approval/notes free text; `reason` is the rejection
 * justification. Budget / activation / case REJECT requires `reason`.
 */
export class UnifiedApprovalDecisionDto {
  @ApiProperty({
    description: 'Approval source — selects which downstream service handles the decision.',
    enum: APPROVAL_SOURCES,
  })
  @IsString()
  @IsIn(APPROVAL_SOURCES)
  source!: UnifiedApprovalDecisionSource;

  @ApiProperty({
    description: 'Decision verdict.',
    enum: ['APPROVE', 'REJECT'],
  })
  @IsString()
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({
    description: 'Free-text approver note. Max 1000 chars. Surfaced in the audit trail.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({
    description:
      'Rejection justification. Required when decision=REJECT for budget / activation / case sources.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class UnifiedApprovalDecisionResponseDto {
  @ApiProperty({ description: 'Approval id on the source aggregate (echoed back from the request).' })
  approvalId!: string;

  @ApiProperty({ description: 'Approval source.', enum: APPROVAL_SOURCES })
  source!: UnifiedApprovalDecisionSource;

  @ApiProperty({ description: 'Resolved decision verdict.', enum: ['APPROVED', 'REJECTED'] })
  decision!: 'APPROVED' | 'REJECTED';

  @ApiProperty({ description: 'ISO timestamp of the decision.' })
  decidedAt!: string;

  @ApiProperty({ description: 'Person id of the decider.' })
  decidedByPersonId!: string;
}
