import { Injectable } from '@nestjs/common';

import { demoAssignments, demoPeople, demoProjects } from '../../../../../../prisma/seeds/demo-dataset';
import { CaseReferenceRepositoryPort } from '../../../application/ports/case-reference.repository.port';

@Injectable()
export class InMemoryCaseReferenceRepository implements CaseReferenceRepositoryPort {
  public async assignmentExists(assignmentId: string): Promise<boolean> {
    return demoAssignments.some((assignment) => assignment.id === assignmentId);
  }

  public async personExists(personId: string): Promise<boolean> {
    return demoPeople.some((person) => person.id === personId);
  }

  public async projectExists(projectId: string): Promise<boolean> {
    return demoProjects.some((project) => project.id === projectId);
  }
}
