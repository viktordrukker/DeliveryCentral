import { ApiProperty } from '@nestjs/swagger';

/**
 * LEAN-P4b-3 — Director bench aging breakdown by skill or org unit.
 *
 * For each currently-bench person (no active ProjectPosition.activePersonId),
 * the FE renders a matrix of [dimension value × days-on-bench bucket]. We
 * compute daysOnBench from the most-recent ProjectPositionFillHistory
 * `RELEASED` event (or person.hiredAt / person.createdAt fallback) and bucket
 * into [0-7, 8-30, 31-60, 61-90, 90+] days.
 *
 * `dimension="skill"` groups by Person.skillsets[]; if a person has N skills
 * they appear in N rows (one per skill). `dimension="unit"` groups by the
 * person's active PersonOrgMembership.orgUnitId.
 */
export type BenchAgingDimension = 'skill' | 'unit';

export class BenchAgingBucketCountDto {
  /** Bucket label: `0-7d`, `8-30d`, `31-60d`, `61-90d`, `90d+`. */
  @ApiProperty() bucket!: string;
  @ApiProperty() count!: number;
}

export class BenchAgingRowDto {
  /** Skill name or org-unit name. */
  @ApiProperty() label!: string;
  /** Total bench people in this row (sum across buckets). */
  @ApiProperty() total!: number;
  @ApiProperty({ type: [BenchAgingBucketCountDto] })
  buckets!: BenchAgingBucketCountDto[];
}

export class BenchAgingByDimensionResponseDto {
  @ApiProperty({ enum: ['skill', 'unit'] }) dimension!: BenchAgingDimension;
  @ApiProperty() asOf!: string;
  @ApiProperty({ type: [String] }) bucketLabels!: string[];
  @ApiProperty({ type: [BenchAgingRowDto] }) rows!: BenchAgingRowDto[];
  /** Total bench head-count across all rows (a single person counted once even if multi-skill). */
  @ApiProperty() benchCount!: number;
}
