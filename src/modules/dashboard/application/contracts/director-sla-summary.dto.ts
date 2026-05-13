import { ApiProperty } from '@nestjs/swagger';

/**
 * F-3.3 / WO-4.15/5.6 — Director dashboard SLA + Time-to-fill tiles.
 *
 * `slaBreaches24h` counts ProjectAssignment rows with slaDueAt in
 * [now - 24h, now + 24h] and slaBreachedAt NULL — i.e. assignments
 * about to breach or just breached.
 *
 * `timeToFillSeries` is a rolling 4-week per-week median (days) of
 * `StaffingRequestFulfilment.fulfilledAt - StaffingRequest.createdAt`.
 * Empty array if fewer than 3 fulfilments across the window.
 *
 * `timeToFillMedianDays` is the median across the 4-week window
 * (null if no fulfilments).
 */
export class DirectorSlaSummaryDto {
  @ApiProperty({ description: 'Count of ProjectAssignments breaching SLA within ±24h.' })
  public slaBreaches24h!: number;

  @ApiProperty({ description: 'Per-week median time-to-fill in days (4 weeks).', type: [Number] })
  public timeToFillSeries!: number[];

  @ApiProperty({ description: 'Median time-to-fill across the 4-week window in days. Null when fewer than 3 fulfilments.', nullable: true })
  public timeToFillMedianDays!: number | null;

  @ApiProperty({ description: 'Number of fulfilments contributing to the metric.' })
  public timeToFillSampleSize!: number;
}
