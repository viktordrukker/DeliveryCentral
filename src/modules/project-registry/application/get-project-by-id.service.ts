import { Injectable } from '@nestjs/common';

import { ProjectAssignmentRepositoryPort } from '@src/modules/assignments/domain/repositories/project-assignment-repository.port';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { ProjectExternalLinkRepositoryPort } from '../domain/repositories/project-external-link-repository.port';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';

import { ProjectBudgetStatus, ProjectDetailsDto } from './contracts/project-directory.dto';

@Injectable()
export class GetProjectByIdService {
  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly projectExternalLinkRepository: ProjectExternalLinkRepositoryPort,
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly prisma?: PrismaService,
  ) {}

  public async execute(projectId: string): Promise<ProjectDetailsDto | null> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      return null;
    }

    const [projectLinks, assignments, prismaProject, latestBudget, openPositionsCount] = await Promise.all([
      this.projectExternalLinkRepository.findByProjectId(project.projectId),
      this.projectAssignmentRepository.findAll(),
      this.prisma
        ? this.prisma.project.findUnique({ where: { id: project.id }, select: { shape: true, hasLiveSpcRates: true } })
        : Promise.resolve(null),
      this.prisma
        ? this.prisma.projectBudget.findFirst({
            where: { projectId: project.id },
            orderBy: { fiscalYear: 'desc' },
            select: {
              capexBudget: true,
              opexBudget: true,
              earnedValue: true,
              actualCost: true,
              eac: true,
            },
          })
        : Promise.resolve(null),
      this.prisma
        ? this.prisma.projectPosition.count({
            where: { projectId: project.id, fillStatus: 'OPEN' },
          })
        : Promise.resolve(0),
    ]);

    let cpi: number | null = null;
    let budgetStatus: ProjectBudgetStatus = 'UNSET';
    if (latestBudget) {
      const ev = latestBudget.earnedValue === null ? null : Number(latestBudget.earnedValue);
      const ac = latestBudget.actualCost === null ? null : Number(latestBudget.actualCost);
      if (ev !== null && ac !== null && ac > 0) {
        cpi = ev / ac;
      }
      const bac = Number(latestBudget.capexBudget) + Number(latestBudget.opexBudget);
      const eac = latestBudget.eac === null ? null : Number(latestBudget.eac);
      if (bac > 0) {
        const projected = eac ?? ac ?? 0;
        if (projected > bac) {
          budgetStatus = 'RED';
        } else if (projected > bac * 0.85) {
          budgetStatus = 'YELLOW';
        } else {
          budgetStatus = 'GREEN';
        }
      }
    }
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
      budgetStatus,
      cpi,
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
      openPositionsCount,
      plannedEndDate: project.endsOn?.toISOString() ?? null,
      projectCode: project.projectCode,
      projectManagerId: project.projectManagerId?.value ?? null,
      projectManagerDisplayName: this.prisma && project.projectManagerId?.value
        ? (await this.prisma.person.findFirst({
            select: { displayName: true },
            where: { id: project.projectManagerId.value },
          }))?.displayName ?? null
        : null,
      deliveryManagerId: project.deliveryManagerId?.value ?? null,
      deliveryManagerDisplayName: this.prisma && project.deliveryManagerId?.value
        ? (await this.prisma.person.findFirst({
            select: { displayName: true },
            where: { id: project.deliveryManagerId.value },
          }))?.displayName ?? null
        : null,
      clientId: project.clientId ?? null,
      clientName: this.prisma && project.clientId
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
      shape: prismaProject?.shape ?? null,
      hasLiveSpcRates: prismaProject?.hasLiveSpcRates ?? false,
      version: project.version,
    };
  }
}
