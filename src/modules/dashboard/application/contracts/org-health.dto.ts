import { ApiProperty } from '@nestjs/swagger';

/**
 * LEAN-P4-missing-5 — Director "Org Health" metrics per OrganizationalUnit.
 *
 * Per active OrgUnit at `asOf`:
 *  - `headcount`       — active PersonOrgMemberships pointing at the unit
 *                        (Person.employmentStatus in ACTIVE/LEAVE; membership window covers asOf).
 *  - `staffedCount`    — members above whose Person.id appears as
 *                        ProjectPosition.activePersonId with fillStatus in
 *                        BOOKED/ONBOARDING/ASSIGNED/ON_HOLD AND
 *                        activeValidFrom <= asOf < activeValidTo (or null bound).
 *  - `benchSize`       — `headcount - staffedCount`.
 *  - `unfillRatePct`   — `(benchSize / headcount) * 100`, rounded to one decimal;
 *                        zero when headcount is zero.
 */
export class OrgHealthUnitDto {
  @ApiProperty({ description: 'OrgUnit primary key (UUID).' })
  public orgUnitId!: string;

  @ApiProperty({ description: 'OrgUnit display code.' })
  public orgUnitCode!: string;

  @ApiProperty({ description: 'OrgUnit display name.' })
  public orgUnitName!: string;

  @ApiProperty({ description: 'Active membership count at asOf.' })
  public headcount!: number;

  @ApiProperty({ description: 'Members on an active ProjectPosition at asOf.' })
  public staffedCount!: number;

  @ApiProperty({ description: 'Members not on an active ProjectPosition (headcount - staffedCount).' })
  public benchSize!: number;

  @ApiProperty({ description: 'Percentage of members on bench. One decimal place.' })
  public unfillRatePct!: number;
}

export class OrgHealthResponseDto {
  @ApiProperty({ description: 'As-of timestamp the snapshot was taken at. ISO-8601.' })
  public asOf!: string;

  @ApiProperty({ description: 'Total active members across all units.' })
  public totalHeadcount!: number;

  @ApiProperty({ description: 'Total bench size across all units.' })
  public totalBenchSize!: number;

  @ApiProperty({ description: 'Portfolio-wide bench / headcount, one decimal place.' })
  public portfolioUnfillRatePct!: number;

  @ApiProperty({ description: 'Per-unit metrics, sorted by unfillRatePct DESC then headcount DESC.', type: [OrgHealthUnitDto] })
  public units!: OrgHealthUnitDto[];
}
