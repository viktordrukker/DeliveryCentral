import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { CmdkResultDto, CmdkResultKind } from './contracts/cmdk-result.dto';

/**
 * FE-#270 — Global ⌘K command-palette search.
 *
 * Composes parallel prefix + substring matches across the five most
 * commonly-jumped-to entities: Person, Project, ProjectPosition,
 * CaseRecord, ProjectAssignment.
 *
 * Ranking (0..1):
 *   - Prefix match on primary title (name / displayName / caseNumber): 0.9
 *   - Substring match on title: 0.6
 *   - Substring match on secondary text (description / notes / role): 0.35
 *   - Archived / closed / cancelled / released rows get ×0.5 applied last
 *
 * Tenancy: every Prisma model already has tenant scoping enforced via
 * the PrismaService middleware (DM-7.5). No extra filter needed here.
 *
 * Performance: each entity query is `take: limit` so a worst-case 5 ×
 * limit = 100 rows fan-in for a default limit of 20. p95 target <200ms
 * on the typical 10K-person / 200-project workload.
 */
@Injectable()
export class CmdkSearchService {
  public constructor(private readonly prisma: PrismaService) {}

  public async search(args: { q: string; limit?: number }): Promise<CmdkResultDto[]> {
    const q = (args.q ?? '').trim();
    if (q.length < 2) return [];
    const limit = Math.min(50, Math.max(1, args.limit ?? 20));

    const [people, projects, positions, cases, assignments] = await Promise.all([
      this.searchPeople(q, limit),
      this.searchProjects(q, limit),
      this.searchPositions(q, limit),
      this.searchCases(q, limit),
      this.searchAssignments(q, limit),
    ]);

    const all = [...people, ...projects, ...positions, ...cases, ...assignments];
    all.sort((a, b) => b.rank - a.rank);
    return all.slice(0, limit);
  }

  private async searchPeople(q: string, limit: number): Promise<CmdkResultDto[]> {
    const rows = await this.prisma.person.findMany({
      where: {
        deletedAt: null,
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { primaryEmail: { contains: q, mode: 'insensitive' } },
          { personNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        displayName: true,
        primaryEmail: true,
        role: true,
        archivedAt: true,
        terminatedAt: true,
      },
      take: limit,
    });
    return rows.map((r) => buildResult({
      kind: 'person',
      id: r.id,
      title: r.displayName,
      subtitle: r.role ?? r.primaryEmail ?? undefined,
      href: `/people/${r.id}`,
      query: q,
      archived: r.archivedAt !== null || r.terminatedAt !== null,
    }));
  }

  private async searchProjects(q: string, limit: number): Promise<CmdkResultDto[]> {
    const rows = await this.prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { projectCode: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        projectCode: true,
        description: true,
        status: true,
      },
      take: limit,
    });
    return rows.map((r) => buildResult({
      kind: 'project',
      id: r.id,
      title: r.name,
      subtitle: r.projectCode,
      href: `/projects/${r.id}`,
      query: q,
      archived: r.status === 'COMPLETED' || r.status === 'ARCHIVED',
    }));
  }

  private async searchPositions(q: string, limit: number): Promise<CmdkResultDto[]> {
    const rows = await this.prisma.projectPosition.findMany({
      where: {
        OR: [
          { role: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        role: true,
        summary: true,
        fillStatus: true,
      },
      take: limit,
    });
    return rows.map((r) => buildResult({
      kind: 'position',
      id: r.id,
      title: r.role,
      subtitle: r.summary ?? undefined,
      href: `/positions/${r.id}`,
      query: q,
      archived: r.fillStatus === 'RELEASED',
    }));
  }

  private async searchCases(q: string, limit: number): Promise<CmdkResultDto[]> {
    const rows = await this.prisma.caseRecord.findMany({
      where: {
        OR: [
          { caseNumber: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        caseNumber: true,
        summary: true,
        status: true,
      },
      take: limit,
    });
    return rows.map((r) => buildResult({
      kind: 'case',
      id: r.id,
      title: r.caseNumber,
      subtitle: r.summary ?? undefined,
      href: `/cases/${r.id}`,
      query: q,
      archived: r.status === 'COMPLETED' || r.status === 'CANCELLED',
    }));
  }

  private async searchAssignments(q: string, limit: number): Promise<CmdkResultDto[]> {
    // Assignments don't carry their own free-text — search by joined Person
    // displayName + Project name. Two narrow queries are easier than a
    // cross-join here.
    const [byPerson, byProject] = await Promise.all([
      this.prisma.projectAssignment.findMany({
        where: { person: { displayName: { contains: q, mode: 'insensitive' } } },
        select: {
          id: true,
          person: { select: { displayName: true } },
          project: { select: { name: true } },
          status: true,
        },
        take: limit,
      }),
      this.prisma.projectAssignment.findMany({
        where: { project: { name: { contains: q, mode: 'insensitive' } } },
        select: {
          id: true,
          person: { select: { displayName: true } },
          project: { select: { name: true } },
          status: true,
        },
        take: limit,
      }),
    ]);
    const merged = new Map<string, (typeof byPerson)[number]>();
    for (const r of [...byPerson, ...byProject]) merged.set(r.id, r);
    return [...merged.values()].map((r) =>
      buildResult({
        kind: 'assignment',
        id: r.id,
        title: `${r.person.displayName} → ${r.project.name}`,
        subtitle: r.status,
        href: `/assignments/${r.id}`,
        query: q,
        archived: r.status === 'COMPLETED' || r.status === 'CANCELLED',
      }),
    );
  }
}

function buildResult(args: {
  kind: CmdkResultKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  query: string;
  archived: boolean;
}): CmdkResultDto {
  const titleLower = args.title.toLowerCase();
  const qLower = args.query.toLowerCase();
  let rank: number;
  if (titleLower.startsWith(qLower)) rank = 0.9;
  else if (titleLower.includes(qLower)) rank = 0.6;
  else rank = 0.35;
  if (args.archived) rank *= 0.5;
  return {
    kind: args.kind,
    id: args.id,
    title: args.title,
    subtitle: args.subtitle,
    href: args.href,
    rank: Math.round(rank * 1000) / 1000,
  };
}
