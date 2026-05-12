import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * F-3.2 / WO-4.14 — single pending action item across SR slate picks,
 * budget-change approvals, leave-request approvals, and timesheet
 * approvals. Returned by `GET /api/dashboard/pending-actions`.
 *
 * Each item is a discoverable "needs my attention" row on the
 * manager dashboard. `ctaUrl` points to the entity surface where the
 * approval/pick action lives (we ship one-click approve on case +
 * budget tabs in F-3.1; staffing slate pick is on the SR detail page).
 */
export class PendingActionItemDto {
  @ApiProperty({ description: 'Aggregated source kind for routing.', enum: ['STAFFING_REQUEST', 'BUDGET_CHANGE', 'LEAVE_REQUEST', 'TIMESHEET'] })
  public kind!: 'STAFFING_REQUEST' | 'BUDGET_CHANGE' | 'LEAVE_REQUEST' | 'TIMESHEET';

  @ApiProperty({ description: 'Underlying entity id (UUID).' })
  public id!: string;

  @ApiPropertyOptional({ description: 'Opaque public id where the underlying entity exposes one.', nullable: true })
  public publicId!: string | null;

  @ApiProperty({ description: 'Short entity title (e.g. SR title, project name, leave dates).' })
  public title!: string;

  @ApiPropertyOptional({ description: 'Secondary context label (project code, fiscal year, week-of, etc).', nullable: true })
  public contextLabel!: string | null;

  @ApiProperty({ description: 'Hours since the item entered the pending state.' })
  public ageHours!: number;

  @ApiProperty({ description: 'Visual severity bucket derived from age vs SLA.', enum: ['LOW', 'MEDIUM', 'HIGH'] })
  public severity!: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty({ description: 'Frontend route the manager should click through to in order to act on this item.' })
  public ctaUrl!: string;
}

export class PendingActionsResponseDto {
  @ApiProperty({ description: 'Up to 10 newest pending actions across all sources.', type: [PendingActionItemDto] })
  public items!: PendingActionItemDto[];

  @ApiProperty({ description: 'Total count across all sources (may exceed items.length).' })
  public totalCount!: number;
}
