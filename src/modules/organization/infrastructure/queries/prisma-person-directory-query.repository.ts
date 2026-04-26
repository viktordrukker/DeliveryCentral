import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  ListPersonDirectoryResult,
  PersonDirectoryQueryRepositoryPort,
  PersonDirectoryRecord,
} from '../../application/ports/person-directory-query.repository.port';

@Injectable()
export class PrismaPersonDirectoryQueryRepository
  implements PersonDirectoryQueryRepositoryPort
{
  public constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, asOf: Date = new Date()): Promise<PersonDirectoryRecord | null> {
    if (!PrismaPersonDirectoryQueryRepository.looksLikeUuid(id)) {
      return null;
    }

    const record = await this.prisma.person.findFirst({
      include: {
        orgMemberships: {
          include: {
            orgUnit: {
              select: {
                code: true,
                id: true,
                name: true,
              },
            },
          },
          where: {
            archivedAt: null,
            validFrom: {
              lte: asOf,
            },
            OR: [{ validTo: null }, { validTo: { gte: asOf } }],
          },
        },
        resourcePoolMemberships: {
          include: {
            resourcePool: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: {
            archivedAt: null,
            validFrom: {
              lte: asOf,
            },
            OR: [{ validTo: null }, { validTo: { gte: asOf } }],
          },
        },
        subjectReportingLines: {
          include: {
            manager: {
              select: {
                displayName: true,
                id: true,
              },
            },
          },
          where: {
            archivedAt: null,
            validFrom: {
              lte: asOf,
            },
            OR: [{ validTo: null }, { validTo: { gte: asOf } }],
          },
        },
      },
      where: {
        archivedAt: null,
        deletedAt: null,
        id,
      },
    });

    if (!record) {
      return null;
    }

    const assignmentCounts = await this.getActiveAssignmentCounts([record.id], asOf);

    return this.toDirectoryRecord(record, assignmentCounts.get(record.id) ?? 0);
  }

  public async list(query: {
    asOf: Date;
    departmentId?: string;
    page: number;
    pageSize: number;
    resourcePoolId?: string;
    role?: string;
  }): Promise<ListPersonDirectoryResult> {
    // Resolve personIds that have the requested role via LocalAccount
    let rolePersonIds: Set<string> | null = null;
    if (query.role) {
      const accounts = await this.prisma.localAccount.findMany({
        where: { roles: { has: query.role }, personId: { not: null } },
        select: { personId: true },
      });
      rolePersonIds = new Set(
        accounts.map((a) => a.personId).filter((id): id is string => id !== null),
      );
    }

    const where = {
      archivedAt: null,
      deletedAt: null,
      ...(rolePersonIds !== null ? { id: { in: [...rolePersonIds] } } : {}),
      ...(query.departmentId
        ? {
            orgMemberships: {
              some: {
                archivedAt: null,
                isPrimary: true,
                orgUnitId: query.departmentId,
                validFrom: {
                  lte: query.asOf,
                },
                OR: [{ validTo: null }, { validTo: { gte: query.asOf } }],
              },
            },
          }
        : {}),
      ...(query.resourcePoolId
        ? {
            resourcePoolMemberships: {
              some: {
                archivedAt: null,
                resourcePoolId: query.resourcePoolId,
                validFrom: {
                  lte: query.asOf,
                },
                OR: [{ validTo: null }, { validTo: { gte: query.asOf } }],
              },
            },
          }
        : {}),
    };

    const [people, total] = await Promise.all([
      this.prisma.person.findMany({
      include: {
        orgMemberships: {
          include: {
            orgUnit: {
              select: {
                code: true,
                id: true,
                name: true,
              },
            },
          },
          where: {
            archivedAt: null,
            validFrom: {
              lte: query.asOf,
            },
            OR: [{ validTo: null }, { validTo: { gte: query.asOf } }],
          },
        },
        resourcePoolMemberships: {
          include: {
            resourcePool: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: {
            archivedAt: null,
            validFrom: {
              lte: query.asOf,
            },
            OR: [{ validTo: null }, { validTo: { gte: query.asOf } }],
          },
        },
        subjectReportingLines: {
          include: {
            manager: {
              select: {
                displayName: true,
                id: true,
              },
            },
          },
          where: {
            archivedAt: null,
            validFrom: {
              lte: query.asOf,
            },
            OR: [{ validTo: null }, { validTo: { gte: query.asOf } }],
          },
        },
      },
      where: {
        ...where,
      },
      orderBy: [{ displayName: 'asc' }],
      skip: Math.max(query.page - 1, 0) * query.pageSize,
      take: query.pageSize,
    }),
      this.prisma.person.count({
        where,
      }),
    ]);

    const assignmentCounts = await this.getActiveAssignmentCounts(
      people.map((person) => person.id),
      query.asOf,
    );

    const items = people.map((person) =>
      this.toDirectoryRecord(person, assignmentCounts.get(person.id) ?? 0),
    );

    return {
      items,
      total,
    };
  }

  public async listManagerScope(query: {
    asOf: Date;
    managerId: string;
    page: number;
    pageSize: number;
  }): Promise<{
    directReports: PersonDirectoryRecord[];
    dottedLinePeople: PersonDirectoryRecord[];
    managerId: string;
    page: number;
    pageSize: number;
    totalDirectReports: number;
    totalDottedLinePeople: number;
  }> {
    const activeReportingLines = await this.prisma.reportingLine.findMany({
      where: {
        archivedAt: null,
        managerPersonId: query.managerId,
        validFrom: {
          lte: query.asOf,
        },
        OR: [{ validTo: null }, { validTo: { gte: query.asOf } }],
      },
      select: {
        relationshipType: true,
        subjectPersonId: true,
      },
    });

    const directReportIds = Array.from(
      new Set(
        activeReportingLines
      .filter((line) => line.relationshipType === 'SOLID_LINE')
      .map((line) => line.subjectPersonId),
      ),
    );
    const dottedLineIds = Array.from(
      new Set(
        activeReportingLines
      .filter((line) => line.relationshipType === 'DOTTED_LINE')
      .map((line) => line.subjectPersonId),
      ),
    );
    const scopeIds = Array.from(new Set([...directReportIds, ...dottedLineIds]));
    const directoryById = await this.listByIds(scopeIds, query.asOf);

    const directReportsAll = directReportIds
      .map((id) => directoryById.get(id))
      .filter((item): item is PersonDirectoryRecord => Boolean(item));
    const dottedLinePeopleAll = dottedLineIds
      .map((id) => directoryById.get(id))
      .filter((item): item is PersonDirectoryRecord => Boolean(item));

    const start = Math.max(query.page - 1, 0) * query.pageSize;
    const end = start + query.pageSize;

    return {
      directReports: directReportsAll.slice(start, end),
      dottedLinePeople: dottedLinePeopleAll.slice(start, end),
      managerId: query.managerId,
      page: query.page,
      pageSize: query.pageSize,
      totalDirectReports: directReportsAll.length,
      totalDottedLinePeople: dottedLinePeopleAll.length,
    };
  }

  private async getActiveAssignmentCounts(
    personIds: string[],
    asOf: Date,
  ): Promise<Map<string, number>> {
    if (personIds.length === 0) {
      return new Map();
    }

    const assignments = await this.prisma.projectAssignment.findMany({
      select: {
        personId: true,
      },
      where: {
        archivedAt: null,
        personId: {
          in: personIds,
        },
        status: {
          in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'],
        },
        validFrom: {
          lte: asOf,
        },
        OR: [{ validTo: null }, { validTo: { gte: asOf } }],
      },
    });

    return assignments.reduce<Map<string, number>>((counts, assignment) => {
      counts.set(assignment.personId, (counts.get(assignment.personId) ?? 0) + 1);
      return counts;
    }, new Map());
  }

  private async listByIds(
    personIds: string[],
    asOf: Date,
  ): Promise<Map<string, PersonDirectoryRecord>> {
    if (personIds.length === 0) {
      return new Map();
    }

    const people = await this.prisma.person.findMany({
      include: {
        orgMemberships: {
          include: {
            orgUnit: {
              select: {
                code: true,
                id: true,
                name: true,
              },
            },
          },
          where: {
            archivedAt: null,
            validFrom: {
              lte: asOf,
            },
            OR: [{ validTo: null }, { validTo: { gte: asOf } }],
          },
        },
        resourcePoolMemberships: {
          include: {
            resourcePool: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: {
            archivedAt: null,
            validFrom: {
              lte: asOf,
            },
            OR: [{ validTo: null }, { validTo: { gte: asOf } }],
          },
        },
        subjectReportingLines: {
          include: {
            manager: {
              select: {
                displayName: true,
                id: true,
              },
            },
          },
          where: {
            archivedAt: null,
            validFrom: {
              lte: asOf,
            },
            OR: [{ validTo: null }, { validTo: { gte: asOf } }],
          },
        },
      },
      where: {
        archivedAt: null,
        deletedAt: null,
        id: {
          in: personIds,
        },
      },
    });

    const assignmentCounts = await this.getActiveAssignmentCounts(personIds, asOf);

    return people.reduce<Map<string, PersonDirectoryRecord>>((records, person) => {
      records.set(person.id, this.toDirectoryRecord(person, assignmentCounts.get(person.id) ?? 0));
      return records;
    }, new Map());
  }

  private toDirectoryRecord(
    person: {
      displayName: string;
      employmentStatus: string;
      grade: string | null;
      hiredAt: Date | null;
      id: string;
      orgMemberships: Array<{
        isPrimary: boolean;
        orgUnit: { code: string; id: string; name: string } | null;
      }>;
      primaryEmail: string | null;
      resourcePoolMemberships: Array<{
        resourcePool: { id: string; name: string } | null;
      }>;
      role: string | null;
      terminatedAt: Date | null;
      subjectReportingLines: Array<{
        manager: { displayName: string; id: string } | null;
        relationshipType: 'DOTTED_LINE' | 'FUNCTIONAL' | 'PROJECT' | 'SOLID_LINE';
      }>;
    },
    currentAssignmentCount: number,
  ): PersonDirectoryRecord {
    const primaryMembership =
      person.orgMemberships.find((membership) => membership.isPrimary) ??
      person.orgMemberships[0] ??
      null;
    const solidLine = person.subjectReportingLines.find(
      (line) => line.relationshipType === 'SOLID_LINE',
    );

    return {
      currentAssignmentCount,
      currentLineManager: solidLine?.manager
        ? {
            displayName: solidLine.manager.displayName,
            id: solidLine.manager.id,
          }
        : null,
      currentOrgUnit: primaryMembership?.orgUnit
        ? {
            code: primaryMembership.orgUnit.code,
            id: primaryMembership.orgUnit.id,
            name: primaryMembership.orgUnit.name,
          }
        : null,
      displayName: person.displayName,
      grade: person.grade,
      dottedLineManagers: person.subjectReportingLines
        .filter((line) => line.relationshipType === 'DOTTED_LINE' && line.manager)
        .map((line) => ({
          displayName: line.manager?.displayName ?? '',
          id: line.manager?.id ?? '',
        }))
        .filter((line) => Boolean(line.id)),
      id: person.id,
      hiredAt: person.hiredAt?.toISOString() ?? null,
      lifecycleStatus: person.employmentStatus,
      primaryEmail: person.primaryEmail,
      terminatedAt: person.terminatedAt?.toISOString() ?? null,
      role: person.role,
      resourcePoolIds: person.resourcePoolMemberships
        .map((membership) => membership.resourcePool?.id ?? null)
        .filter((id): id is string => Boolean(id)),
      resourcePools: person.resourcePoolMemberships
        .filter((membership) => membership.resourcePool)
        .map((membership) => ({
          id: membership.resourcePool!.id,
          name: membership.resourcePool!.name,
        })),
    };
  }

  private static looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
}
