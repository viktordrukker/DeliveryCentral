import { demoProjects } from '../../../../../../prisma/seeds/demo-dataset';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { Project, ProjectStatus } from '../../../domain/entities/project.entity';
import { ProjectId } from '../../../domain/value-objects/project-id';
import { InMemoryProjectRepository } from './in-memory-project.repository';

export function createSeededInMemoryProjectRepository(): InMemoryProjectRepository {
  return new InMemoryProjectRepository(
    demoProjects.map((project) => {
      const seededProject = project as typeof project & { endsOn?: Date };

      return Project.create(
        {
          description: seededProject.description,
          endsOn: seededProject.endsOn instanceof Date ? seededProject.endsOn : undefined,
          name: seededProject.name,
          projectCode: seededProject.projectCode,
          projectManagerId: seededProject.projectManagerId
            ? PersonId.from(seededProject.projectManagerId)
            : undefined,
          startsOn: seededProject.startsOn instanceof Date ? seededProject.startsOn : undefined,
          status: seededProject.status as ProjectStatus,
        },
        ProjectId.from(seededProject.id),
      );
    }),
  );
}
