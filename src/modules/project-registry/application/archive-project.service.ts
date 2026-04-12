import { Project } from '../domain/entities/project.entity';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';
import { ProjectId } from '../domain/value-objects/project-id';

interface ArchiveProjectInput {
  archivedAt: Date;
  projectId: ProjectId;
}

export class ArchiveProjectService {
  public constructor(private readonly projectRepository: ProjectRepositoryPort) {}

  public async execute(input: ArchiveProjectInput): Promise<Project> {
    const project = await this.projectRepository.findByProjectId(input.projectId);

    if (!project) {
      throw new Error('Project not found.');
    }

    project.archive(input.archivedAt);
    await this.projectRepository.save(project);

    return project;
  }
}
