import { OrgUnit } from '@src/modules/organization/domain/entities/org-unit.entity';
import { Person } from '@src/modules/organization/domain/entities/person.entity';
import { ReportingLine, ReportingAuthority } from '@src/modules/organization/domain/entities/reporting-line.entity';
import { EffectiveDateRange } from '@src/modules/organization/domain/value-objects/effective-date-range';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { ReportingLineType } from '@src/modules/organization/domain/value-objects/reporting-line-type';

interface PrismaPersonRecord {
  displayName: string;
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'LEAVE' | 'TERMINATED';
  familyName: string;
  grade?: string | null;
  givenName: string;
  id: string;
  orgMemberships?: Array<{
    isPrimary: boolean;
    orgUnitId: string;
  }>;
  primaryEmail: string | null;
  role?: string | null;
  skillsets?: string[];
  terminatedAt?: Date | null;
}

interface PrismaOrgUnitRecord {
  code: string;
  id: string;
  managerPersonId: string | null;
  name: string;
  parentOrgUnitId: string | null;
}

interface PrismaReportingLineRecord {
  authority: ReportingAuthority;
  id: string;
  isPrimary: boolean;
  managerPersonId: string;
  relationshipType: 'DOTTED_LINE' | 'FUNCTIONAL' | 'PROJECT' | 'SOLID_LINE';
  subjectPersonId: string;
  validFrom: Date;
  validTo: Date | null;
}

export class OrganizationPrismaMapper {
  public static toDomainPerson(record: PrismaPersonRecord): Person {
    return Person.register(
      {
        displayName: record.displayName,
        employmentStatus:
          record.employmentStatus === 'INACTIVE'
            ? 'INACTIVE'
            : record.employmentStatus === 'TERMINATED'
              ? 'TERMINATED'
              : 'ACTIVE',
        terminatedAt: record.terminatedAt ?? undefined,
        familyName: record.familyName,
        grade: record.grade ?? undefined,
        givenName: record.givenName,
        orgUnitId: record.orgMemberships?.find((membership) => membership.isPrimary)?.orgUnitId
          ? OrgUnitId.from(
              record.orgMemberships.find((membership) => membership.isPrimary)?.orgUnitId ?? '',
            )
          : undefined,
        primaryEmail: record.primaryEmail ?? undefined,
        role: record.role ?? undefined,
        skillsets: record.skillsets ?? [],
      },
      PersonId.from(record.id),
    );
  }

  public static toDomainOrgUnit(record: PrismaOrgUnitRecord): OrgUnit {
    return OrgUnit.create(
      {
        code: record.code,
        managerPersonId: record.managerPersonId ? PersonId.from(record.managerPersonId) : undefined,
        name: record.name,
        parentOrgUnitId: record.parentOrgUnitId ? OrgUnitId.from(record.parentOrgUnitId) : undefined,
      },
      OrgUnitId.from(record.id),
    );
  }

  public static toDomainReportingLine(record: PrismaReportingLineRecord): ReportingLine {
    return ReportingLine.create(
      {
        authority: record.authority,
        effectiveDateRange: EffectiveDateRange.create(record.validFrom, record.validTo ?? undefined),
        isPrimary: record.isPrimary,
        managerId: PersonId.from(record.managerPersonId),
        subjectId: PersonId.from(record.subjectPersonId),
        type: OrganizationPrismaMapper.toReportingLineType(record.relationshipType),
      },
      record.id,
    );
  }

  private static toReportingLineType(
    type: PrismaReportingLineRecord['relationshipType'],
  ): ReportingLineType {
    switch (type) {
      case 'DOTTED_LINE':
        return ReportingLineType.dottedLine();
      case 'FUNCTIONAL':
        return ReportingLineType.functional();
      case 'PROJECT':
        return ReportingLineType.project();
      case 'SOLID_LINE':
      default:
        return ReportingLineType.solidLine();
    }
  }
}
