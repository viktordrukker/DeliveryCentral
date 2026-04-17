import { Injectable } from '@nestjs/common';

import { ProjectAssignmentRepositoryPort } from '@src/modules/assignments/domain/repositories/project-assignment-repository.port';

import { ProjectDirectoryItemDto } from './contracts/project-directory.dto';
import { ProjectExternalLinkRepositoryPort } from '../domain/repositories/project-external-link-repository.port';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';

interface ProjectDirectoryQuery {
  source?: string;
}

@Injectable()
export class ProjectDirectoryQueryService {
  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly projectExternalLinkRepository: ProjectExternalLinkRepositoryPort,
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
  ) {}

  public async execute(query: ProjectDirectoryQuery): Promise<{ items: ProjectDirectoryItemDto[] }> {
    const source = query.source?.trim().toUpperCase();
    const [projects, assignments, externalLinks] = await Promise.all([
      this.projectRepository.findAll(),
      this.projectAssignmentRepository.findAll(),
      this.projectExternalLinkRepository.findAll(),
    ]);
    const assignmentCountsByProjectId = assignments.reduce<Map<string, number>>((counts, assignment) => {
      counts.set(assignment.projectId, (counts.get(assignment.projectId) ?? 0) + 1);
      return counts;
    }, new Map());
    const externalLinksByProjectId = externalLinks.reduce<Map<string, typeof externalLinks>>(
      (grouped, link) => {
        const existing = grouped.get(link.projectId.value) ?? [];
        existing.push(link);
        grouped.set(link.projectId.value, existing);
        return grouped;
      },
      new Map(),
    );

    const items: ProjectDirectoryItemDto[] = [];
    for (const project of projects) {
      const projectLinks = externalLinksByProjectId.get(project.projectId.value) ?? [];

      if (
        source &&
        !projectLinks.some((link) => link.systemType.value.toUpperCase() === source)
      ) {
        continue;
      }

      const externalLinksSummary = Array.from(
        projectLinks.reduce((map, link) => {
          const key = link.systemType.value.toUpperCase();
          map.set(key, (map.get(key) ?? 0) + 1);
          return map;
        }, new Map<string, number>()),
      ).map(([provider, count]) => ({ count, provider }));

      items.push({
        assignmentCount: assignmentCountsByProjectId.get(project.id) ?? 0,
        clientName: (project as any).clientName ?? null,
        engagementModel: project.engagementModel ?? null,
        externalLinksCount: projectLinks.length,
        externalLinksSummary,
        id: project.id,
        name: project.name,
        priority: project.priority ?? null,
        projectCode: project.projectCode,
        status: project.status,
        version: project.version,
      });
    }

    return { items };
  }
}
