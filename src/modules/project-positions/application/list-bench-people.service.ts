import { Injectable } from '@nestjs/common';

import { ProjectPositionRepositoryPort } from '../domain/repositories/project-position-repository.port';

export interface BenchPerson {
  personId: string;
  /** True if the person has zero active fills on the as-of date. */
  isOnBench: boolean;
  /** Total active allocation across all their fills (sum, 0-100+). */
  totalActiveAllocationPercent: number;
  /** Count of active fills (BOOKED/ONBOARDING/ASSIGNED/ON_HOLD). */
  activeFillCount: number;
}

/**
 * S2-3 — derive the "bench" list.
 *
 * Bench is NOT a stored entity. A Person is on the bench iff they have zero
 * active fills (status in BOOKED/ONBOARDING/ASSIGNED/ON_HOLD with
 * activeValidFrom..activeValidTo bracketing the as-of date).
 *
 * For now this service takes a candidate personId list (or a "for all known
 * people" mode handled at the controller layer) and reports their fill state.
 * A full Person-directory join lives at the controller level so this service
 * stays narrow on the Position side.
 */
@Injectable()
export class ListBenchPeopleService {
  public constructor(private readonly repository: ProjectPositionRepositoryPort) {}

  public async checkPeople(personIds: readonly string[], asOf: Date): Promise<BenchPerson[]> {
    const results: BenchPerson[] = [];
    for (const personId of personIds) {
      const activeFills = await this.repository.findActiveByPersonId(personId, asOf);
      const totalAllocation = activeFills.reduce(
        (acc, position) => acc + (position.activeAllocationPercent ?? 0),
        0,
      );
      results.push({
        personId,
        isOnBench: activeFills.length === 0,
        totalActiveAllocationPercent: totalAllocation,
        activeFillCount: activeFills.length,
      });
    }
    return results;
  }
}
