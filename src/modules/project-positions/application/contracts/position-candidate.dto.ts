import { ApiProperty } from '@nestjs/swagger';

/**
 * NEW-LGL-7 / action B-03 — a ranked suggested fill for a single open position.
 * Scored off the lean `ProjectPosition` model (role + required skills) against
 * the derived bench (people with no active fill). No legacy ProjectAssignment /
 * StaffingRequest reads.
 */
export class PositionCandidateDto {
  @ApiProperty() personId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() role!: string;
  @ApiProperty({ required: false, nullable: true }) grade?: string | null;
  /** 0..1, two-decimal. 0.6·skillFit + 0.3·roleMatch + 0.1·availability. */
  @ApiProperty() matchScore!: number;
  @ApiProperty({ type: [String] }) matchedSkills!: string[];
  @ApiProperty({ type: [String] }) missingSkills!: string[];
  @ApiProperty({ description: 'Free hours over the next 14 days: 80 h capacity minus Σ active allocation.' })
  availabilityHours14d!: number;
}

export class PositionCandidatesResponseDto {
  @ApiProperty() positionId!: string;
  @ApiProperty({ type: [String] }) requiredSkills!: string[];
  @ApiProperty({ type: [PositionCandidateDto] }) candidates!: PositionCandidateDto[];
}
