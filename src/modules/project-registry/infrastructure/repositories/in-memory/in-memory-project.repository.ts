import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ProjectRepositoryPort } from '@src/modules/project-registry/domain/repositories/project-repository.port';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { ProjectLifecycleConflictError } from '@src/modules/project-registry/application/project-lifecycle-conflict.error';

export class InMemoryProjectRepository implements ProjectRepositoryPort {
  public constructor(private readonly items: Project[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findById(id: string): Promise<Project | null> {
    const project = this.items.find((item) => item.id === id);
    return project ? this.cloneProject(project) : null;
  }

  public async findByProjectCode(projectCode: string): Promise<Project | null> {
    const project = this.items.find((item) => item.projectCode === projectCode);
    return project ? this.cloneProject(project) : null;
  }

  public async findAll(): Promise<Project[]> {
    return this.items.map((item) => this.cloneProject(item));
  }

  public async findByProjectId(projectId: ProjectId): Promise<Project | null> {
    const project = this.items.find((item) => item.projectId.equals(projectId));
    return project ? this.cloneProject(project) : null;
  }

  public async assertCurrentVersion(projectId: ProjectId, version: number): Promise<Project> {
    const project = this.items.find(
      (item) => item.projectId.equals(projectId) && item.version === version,
    );

    if (!project) {
      throw new ProjectLifecycleConflictError();
    }

    return this.cloneProject(project);
  }

  public async save(aggregate: Project): Promise<void> {
    const index = this.items.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      const persisted = this.items[index];
      if (persisted.version !== aggregate.version) {
        throw new ProjectLifecycleConflictError();
      }

      const nextVersion = aggregate.version + 1;
      aggregate.synchronizeVersion(nextVersion);
      this.items.splice(index, 1, this.cloneProject(aggregate));
      return;
    }

    aggregate.synchronizeVersion(1);
    this.items.push(this.cloneProject(aggregate));
  }

  private cloneProject(project: Project): Project {
    return Project.create(
      {
        archivedAt: project.archivedAt,
        description: project.description,
        endsOn: project.endsOn,
        name: project.name,
        projectCode: project.projectCode,
        projectManagerId: project.projectManagerId,
        startsOn: project.startsOn,
        status: project.status,
        version: project.version,
      },
      project.projectId,
    );
  }
}
