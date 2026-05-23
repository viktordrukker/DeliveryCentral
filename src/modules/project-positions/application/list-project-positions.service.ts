import { Injectable } from '@nestjs/common';

import { ProjectPosition } from '../domain/entities/project-position.entity';
import {
  ListProjectPositionsQuery,
  ProjectPositionRepositoryPort,
} from '../domain/repositories/project-position-repository.port';

export interface ListProjectPositionsResult {
  positions: ProjectPosition[];
  total: number;
}

/**
 * S2-3 — paginated list of ProjectPositions matching a query.
 *
 * Caps `take` at 200 to match the D-144 hot-path findMany cap pattern.
 */
@Injectable()
export class ListProjectPositionsService {
  private static readonly MAX_TAKE = 200;
  private static readonly DEFAULT_TAKE = 50;

  public constructor(private readonly repository: ProjectPositionRepositoryPort) {}

  public async execute(query: ListProjectPositionsQuery = {}): Promise<ListProjectPositionsResult> {
    const take = Math.min(
      query.take ?? ListProjectPositionsService.DEFAULT_TAKE,
      ListProjectPositionsService.MAX_TAKE,
    );
    const skip = Math.max(query.skip ?? 0, 0);

    const [positions, total] = await Promise.all([
      this.repository.findByQuery({ ...query, skip, take }),
      this.repository.countByQuery({
        projectId: query.projectId,
        activePersonId: query.activePersonId,
        fillStatuses: query.fillStatuses,
        asOf: query.asOf,
      }),
    ]);

    return { positions, total };
  }
}
