import { Injectable } from '@nestjs/common';

import { ProjectId } from '../domain/value-objects/project-id';
import { Project, ProjectStatus } from '../domain/entities/project.entity';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';

interface UpdateProjectCommand {
  description?: string;
  name?: string;
  projectId: string;
  status?: ProjectStatus;
}

@Injectable()
export class UpdateProjectService {
  public constructor(private readonly repository: ProjectRepositoryPort) {}

  public async execute(command: UpdateProjectCommand): Promise<Project> {
    const id = ProjectId.from(command.projectId);
    const project = await this.repository.findByProjectId(id);

    if (!project) {
      throw new Error('Project does not exist.');
    }

    project.enrich({
      description: command.description,
      name: command.name,
      status: command.status,
    });

    await this.repository.save(project);
    return project;
  }
}
