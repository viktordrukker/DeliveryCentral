import { ApiProperty } from '@nestjs/swagger';

import {
  POSITION_PRIORITY_VALUES,
  ProjectPosition,
  type PositionPriorityValue,
} from '../../domain/entities/project-position.entity';
import { PositionFillStatusValue } from '../../domain/value-objects/position-fill-status';

export interface AvailableTransition {
  to: PositionFillStatusValue;
  requiresReason: boolean;
}

export class ProjectPositionResponseDto {
  @ApiProperty() id!: string;
  // W1-11 — opaque tenant-scoped identifier (`pos_…`) preferred for URLs and
  // deep-links. Null for rows that pre-date the W1-07 backfill until the
  // wizard / admin tool re-runs the backfill on legacy data.
  @ApiProperty({ nullable: true }) publicId!: string | null;
  @ApiProperty() projectId!: string;
  @ApiProperty() role!: string;
  @ApiProperty({ type: [String] }) skills!: string[];
  @ApiProperty({ required: false }) summary?: string;
  @ApiProperty({ enum: POSITION_PRIORITY_VALUES }) priority!: PositionPriorityValue;
  @ApiProperty() requiredAllocationPercent!: number;
  @ApiProperty({ enum: ['DRAFT', 'OPEN', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD', 'RELEASED'] })
  fillStatus!: PositionFillStatusValue;
  @ApiProperty({ required: false }) activePersonId?: string;
  // SC-7 — names resolved at the presentation boundary so the FE never renders
  // raw UUIDs. Optional: populated by handlers that enrich; absent on raw maps.
  @ApiProperty({ required: false }) activePersonName?: string;
  @ApiProperty({ required: false }) projectName?: string;
  @ApiProperty({ required: false }) projectCode?: string;
  @ApiProperty({ required: false }) activeAllocationPercent?: number;
  @ApiProperty({ required: false }) onHoldReason?: string;
  @ApiProperty({ required: false }) onHoldCaseId?: string;
  @ApiProperty({ required: false }) releaseReason?: string;
  @ApiProperty({ required: false }) rejectionReason?: string;
  @ApiProperty({ required: false }) cancellationReason?: string;
  @ApiProperty() version!: number;
  @ApiProperty({ required: false }) createdByPersonId?: string;
  @ApiProperty({ required: false }) updatedByPersonId?: string;
  // Position-workflow — the lifecycle transitions the CALLER may perform from
  // the current fillStatus (admin sees all). Populated only on the detail
  // endpoint so the FE can render exactly the legal actions, no FE/BE drift.
  @ApiProperty({ required: false, type: [Object] })
  availableTransitions?: AvailableTransition[];

  public static from(
    position: ProjectPosition,
    names?: { activePersonName?: string; projectName?: string; projectCode?: string },
    availableTransitions?: AvailableTransition[],
  ): ProjectPositionResponseDto {
    return {
      id: position.positionId.value,
      publicId: position.publicId ?? null,
      projectId: position.projectId,
      role: position.role,
      skills: position.skills,
      summary: position.summary,
      priority: position.priority,
      requiredAllocationPercent: position.requiredAllocationPercent,
      fillStatus: position.fillStatus.value,
      activePersonId: position.activePersonId,
      activePersonName: names?.activePersonName,
      projectName: names?.projectName,
      projectCode: names?.projectCode,
      activeAllocationPercent: position.activeAllocationPercent,
      onHoldReason: position.onHoldReason,
      onHoldCaseId: position.onHoldCaseId,
      releaseReason: position.releaseReason,
      rejectionReason: position.rejectionReason,
      cancellationReason: position.cancellationReason,
      version: position.version,
      createdByPersonId: position.createdByPersonId,
      updatedByPersonId: position.updatedByPersonId,
      availableTransitions,
    };
  }
}

export class ListProjectPositionsResponseDto {
  @ApiProperty({ type: [ProjectPositionResponseDto] })
  positions!: ProjectPositionResponseDto[];
  @ApiProperty() total!: number;
}

export class BenchPersonResponseDto {
  @ApiProperty() personId!: string;
  @ApiProperty() isOnBench!: boolean;
  @ApiProperty() totalActiveAllocationPercent!: number;
  @ApiProperty() activeFillCount!: number;
}

export class BenchCheckResponseDto {
  @ApiProperty({ type: [BenchPersonResponseDto] })
  people!: BenchPersonResponseDto[];
}
