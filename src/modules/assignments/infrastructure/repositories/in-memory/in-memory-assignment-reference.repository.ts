import { Injectable } from '@nestjs/common';

import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';

import { demoProjects } from '../../../../../../prisma/seeds/demo-dataset';
import { AssignmentReferenceRepositoryPort } from '../../../application/ports/assignment-reference.repository.port';

@Injectable()
export class InMemoryAssignmentReferenceRepository
  implements AssignmentReferenceRepositoryPort
{
  public constructor(private readonly personRepository: InMemoryPersonRepository) {}

  public async personExists(personId: string): Promise<boolean> {
    return Boolean(await this.personRepository.findById(personId));
  }

  public async personIsActive(personId: string): Promise<boolean> {
    const person = await this.personRepository.findById(personId);
    return person?.status === 'ACTIVE';
  }

  public async projectExists(projectId: string): Promise<boolean> {
    return demoProjects.some((project) => project.id === projectId);
  }
}
