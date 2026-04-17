import { Injectable } from '@nestjs/common';

import { ProjectAssignmentRepositoryPort } from '@src/modules/assignments/domain/repositories/project-assignment-repository.port';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { ProjectExternalLinkRepositoryPort } from '../domain/repositories/project-external-link-repository.port';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';

import { ProjectDetailsDto } from './contracts/project-directory.dto';

@Injectable()
export class GetProjectByIdService {
  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly projectExternalLinkRepository: ProjectExternalLinkRepositoryPort,
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  public async execute(projectId: string): Promise<ProjectDetailsDto | null> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      return null;
    }

    const [projectLinks, assignments] = await Promise.all([
      this.projectExternalLinkRepository.findByProjectId(project.projectId),
      this.projectAssignmentRepository.findAll(),
    ]);
    const externalLinksSummary = Array.from(
      projectLinks.reduce((map, link) => {
        const key = link.systemType.value.toUpperCase();
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map<string, number>()),
    ).map(([provider, count]) => ({
      count,
      provider,
    }));

    return {
      assignmentCount: assignments.filter((assignment) => assignment.projectId === project.id).length,
      description: project.description ?? null,
      externalLinks: projectLinks.map((link) => ({
        archived: Boolean(link.archivedAt),
        externalProjectKey: link.externalProjectKey.value,
        externalProjectName: link.externalProjectName ?? link.externalProjectKey.value,
        externalUrl: link.externalUrl ?? null,
        provider: link.systemType.value,
        providerEnvironment: link.providerEnvironment ?? null,
      })),
      externalLinksCount: projectLinks.length,
      externalLinksSummary,
      id: project.id,
      name: project.name,
      plannedEndDate: project.endsOn?.toISOString() ?? null,
      projectCode: project.projectCode,
      projectManagerId: project.projectManagerId?.value ?? null,
      projectManagerDisplayName: project.projectManagerId?.value
        ? (await this.prisma.person.findFirst({
            select: { displayName: true },
            where: { id: project.projectManagerId.value },
          }))?.displayName ?? null
        : null,
      deliveryManagerId: project.deliveryManagerId?.value ?? null,
      deliveryManagerDisplayName: project.deliveryManagerId?.value
        ? (await this.prisma.person.findFirst({
            select: { displayName: true },
            where: { id: project.deliveryManagerId.value },
          }))?.displayName ?? null
        : null,
      clientId: project.clientId ?? null,
      clientName: project.clientId
        ? (await this.prisma.client.findFirst({
            select: { name: true },
            where: { id: project.clientId },
          }))?.name ?? null
        : null,
      domain: project.domain ?? null,
      engagementModel: project.engagementModel ?? null,
      priority: project.priority ?? null,
      projectType: project.projectType ?? null,
      tags: project.tags,
      techStack: project.techStack,
      startDate: project.startsOn?.toISOString() ?? null,
      status: project.status,
      version: project.version,
    };
  }
}
