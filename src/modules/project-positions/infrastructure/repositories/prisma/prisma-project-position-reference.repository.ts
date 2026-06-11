import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectPositionReferenceRepositoryPort } from '../../../application/ports/project-position-reference.repository.port';

/**
 * Prisma adapter for the create-side reference checks. Lightweight `count`
 * probes only — no aggregate hydration. Same pattern as
 * `prisma-case-reference.repository.ts`.
 *
 * "Active" semantics:
 *   - project: any status except CLOSED / ARCHIVED (positions may still be
 *     shaped on DRAFT / PENDING_APPROVAL / ON_HOLD projects);
 *   - person: employmentStatus ACTIVE (excludes LEAVE / INACTIVE / TERMINATED).
 */
@Injectable()
export class PrismaProjectPositionReferenceRepository
  implements ProjectPositionReferenceRepositoryPort
{
  public constructor(private readonly prisma: PrismaService) {}

  public async projectExists(projectId: string): Promise<boolean> {
    const count = await this.prisma.project.count({ where: { id: projectId } });
    return count > 0;
  }

  public async projectIsActive(projectId: string): Promise<boolean> {
    const count = await this.prisma.project.count({
      where: { id: projectId, status: { notIn: ['CLOSED', 'ARCHIVED'] } },
    });
    return count > 0;
  }

  public async personExists(personId: string): Promise<boolean> {
    const count = await this.prisma.person.count({ where: { id: personId } });
    return count > 0;
  }

  public async personIsActive(personId: string): Promise<boolean> {
    const count = await this.prisma.person.count({
      where: { id: personId, employmentStatus: 'ACTIVE' },
    });
    return count > 0;
  }
}
