import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import { CaseReferenceRepositoryPort } from '../../../application/ports/case-reference.repository.port';

@Injectable()
export class PrismaCaseReferenceRepository implements CaseReferenceRepositoryPort {
  public constructor(private readonly prisma: PrismaService) {}

  public async assignmentExists(assignmentId: string): Promise<boolean> {
    const count = await this.prisma.projectAssignment.count({ where: { id: assignmentId } });
    return count > 0;
  }

  public async personExists(personId: string): Promise<boolean> {
    const count = await this.prisma.person.count({ where: { id: personId } });
    return count > 0;
  }

  public async projectExists(projectId: string): Promise<boolean> {
    const count = await this.prisma.project.count({ where: { id: projectId } });
    return count > 0;
  }
}
