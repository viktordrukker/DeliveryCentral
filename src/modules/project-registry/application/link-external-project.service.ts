import { ProjectExternalLink } from '../domain/entities/project-external-link.entity';
import { ProjectExternalLinkRepositoryPort } from '../domain/repositories/project-external-link-repository.port';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';
import { ExternalProjectKey } from '../domain/value-objects/external-project-key';
import { ExternalSystemType } from '../domain/value-objects/external-system-type';
import { ProjectId } from '../domain/value-objects/project-id';

interface LinkExternalProjectInput {
  connectionKey?: string;
  externalProjectKey: ExternalProjectKey;
  externalProjectName?: string;
  externalUrl?: string;
  projectId: ProjectId;
  providerEnvironment?: string;
  systemType: ExternalSystemType;
}

export class LinkExternalProjectService {
  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly projectExternalLinkRepository: ProjectExternalLinkRepositoryPort,
  ) {}

  public async execute(input: LinkExternalProjectInput): Promise<ProjectExternalLink> {
    const project = await this.projectRepository.findByProjectId(input.projectId);

    if (!project) {
      throw new Error('Project not found.');
    }

    const existingLink = await this.projectExternalLinkRepository.findByExternalKey(
      input.systemType,
      input.externalProjectKey,
    );

    if (existingLink && !existingLink.projectId.equals(input.projectId)) {
      throw new Error('External project key is already linked to a different internal project.');
    }

    if (existingLink) {
      existingLink.enrich({
        connectionKey: input.connectionKey,
        externalProjectName: input.externalProjectName,
        externalUrl: input.externalUrl,
        providerEnvironment: input.providerEnvironment,
      });
      await this.projectExternalLinkRepository.save(existingLink);
      return existingLink;
    }

    const link = ProjectExternalLink.create({
      connectionKey: input.connectionKey,
      externalProjectKey: input.externalProjectKey,
      externalProjectName: input.externalProjectName,
      externalUrl: input.externalUrl,
      projectId: input.projectId,
      providerEnvironment: input.providerEnvironment,
      systemType: input.systemType,
    });

    await this.projectExternalLinkRepository.save(link);
    return link;
  }
}
