import { Injectable, NotFoundException } from '@nestjs/common';

import { ProjectPosition } from '../domain/entities/project-position.entity';
import { ProjectPositionRepositoryPort } from '../domain/repositories/project-position-repository.port';
import { PositionId } from '../domain/value-objects/position-id';

@Injectable()
export class GetProjectPositionByIdService {
  public constructor(private readonly repository: ProjectPositionRepositoryPort) {}

  public async execute(positionId: string): Promise<ProjectPosition> {
    const position = await this.repository.findByPositionId(PositionId.from(positionId));
    if (!position) {
      throw new NotFoundException(`ProjectPosition ${positionId} not found.`);
    }
    return position;
  }
}
