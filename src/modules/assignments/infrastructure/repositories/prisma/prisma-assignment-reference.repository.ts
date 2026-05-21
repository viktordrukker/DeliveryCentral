import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';

import { AssignmentReferenceRepositoryPort } from '../../../application/ports/assignment-reference.repository.port';

// F-79 / 20c-10 — drop the hand-rolled Gateway (single `any` method +
// open `[key: string]: unknown` payload shape) in favor of `Pick<>` over
// Prisma's typed delegate.
type ProjectGateway = Pick<Prisma.ProjectDelegate, 'findFirst'>;

@Injectable()
export class PrismaAssignmentReferenceRepository implements AssignmentReferenceRepositoryPort {
  public constructor(
    private readonly personRepository: InMemoryPersonRepository,
    private readonly projectGateway: ProjectGateway,
  ) {}

  public async personExists(personId: string): Promise<boolean> {
    return Boolean(await this.personRepository.findById(personId));
  }

  public async personIsActive(personId: string): Promise<boolean> {
    const person = await this.personRepository.findById(personId);
    return person?.status === 'ACTIVE';
  }

  public async projectExists(projectId: string): Promise<boolean> {
    return Boolean(await this.projectGateway.findFirst({ where: { id: projectId } }));
  }

  public async projectEndDate(projectId: string): Promise<Date | null> {
    const project = await this.projectGateway.findFirst({
      where: { id: projectId },
      select: { endsOn: true },
    });
    return project?.endsOn ?? null;
  }
}
