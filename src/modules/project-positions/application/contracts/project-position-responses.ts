import { ApiProperty } from '@nestjs/swagger';

import { ProjectPosition } from '../../domain/entities/project-position.entity';
import { PositionFillStatusValue } from '../../domain/value-objects/position-fill-status';

export class ProjectPositionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() projectId!: string;
  @ApiProperty() role!: string;
  @ApiProperty() requiredAllocationPercent!: number;
  @ApiProperty({ enum: ['DRAFT', 'OPEN', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD', 'RELEASED'] })
  fillStatus!: PositionFillStatusValue;
  @ApiProperty({ required: false }) activePersonId?: string;
  @ApiProperty({ required: false }) activeAllocationPercent?: number;
  @ApiProperty({ required: false }) onHoldReason?: string;
  @ApiProperty({ required: false }) onHoldCaseId?: string;
  @ApiProperty({ required: false }) releaseReason?: string;
  @ApiProperty() version!: number;
  @ApiProperty({ required: false }) createdByPersonId?: string;
  @ApiProperty({ required: false }) updatedByPersonId?: string;

  public static from(position: ProjectPosition): ProjectPositionResponseDto {
    return {
      id: position.positionId.value,
      projectId: position.projectId,
      role: position.role,
      requiredAllocationPercent: position.requiredAllocationPercent,
      fillStatus: position.fillStatus.value,
      activePersonId: position.activePersonId,
      activeAllocationPercent: position.activeAllocationPercent,
      onHoldReason: position.onHoldReason,
      onHoldCaseId: position.onHoldCaseId,
      releaseReason: position.releaseReason,
      version: position.version,
      createdByPersonId: position.createdByPersonId,
      updatedByPersonId: position.updatedByPersonId,
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
