import { ApiProperty } from '@nestjs/swagger';

/**
 * Inverse of {@link PositionCandidateDto}: given a person, a ranked OPEN
 * position they match. Scored by the same SuggestFillsService.score (skill +
 * role + availability), so a candidate seen "from either side" gets the same
 * weight. Backs the bench inspector's "Suggested fills" list.
 */
export class PersonSuggestedPositionDto {
  @ApiProperty() positionId!: string;
  @ApiProperty() projectId!: string;
  @ApiProperty() projectName!: string;
  @ApiProperty() role!: string;
  /** 0..1, two-decimal. 0.6·skillFit + 0.3·roleMatch + 0.1·availability. */
  @ApiProperty() matchScore!: number;
  @ApiProperty({ type: [String] }) matchedSkills!: string[];
  @ApiProperty({ type: [String] }) missingSkills!: string[];
}

export class PersonSuggestedPositionsResponseDto {
  @ApiProperty() personId!: string;
  @ApiProperty({ type: [PersonSuggestedPositionDto] })
  candidates!: PersonSuggestedPositionDto[];
}
