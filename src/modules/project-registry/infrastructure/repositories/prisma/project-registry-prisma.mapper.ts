import { ExternalSyncState } from '@src/modules/project-registry/domain/entities/external-sync-state.entity';
import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ProjectExternalLink } from '@src/modules/project-registry/domain/entities/project-external-link.entity';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { ExternalProjectKey } from '@src/modules/project-registry/domain/value-objects/external-project-key';
import { ExternalSystemType } from '@src/modules/project-registry/domain/value-objects/external-system-type';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';

interface PrismaProjectRecord {
  archivedAt: Date | null;
  clientId?: string | null;
  deliveryManagerId?: string | null;
  description: string | null;
  domain?: string | null;
  endsOn: Date | null;
  engagementModel?: string | null;
  id: string;
  lessonsLearned?: string | null;
  name: string;
  outcomeRating?: string | null;
  priority?: string | null;
  projectCode: string;
  projectManagerId: string | null;
  projectType?: string | null;
  startsOn: Date | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'CLOSED' | 'COMPLETED' | 'DRAFT' | 'ON_HOLD';
  tags?: string[];
  techStack?: string[];
  version?: number | null;
  wouldStaffSameWay?: boolean | null;
}

interface PrismaProjectExternalLinkRecord {
  archivedAt: Date | null;
  connectionKey: string | null;
  externalProjectKey: string;
  externalProjectName: string | null;
  externalUrl: string | null;
  id: string;
  projectId: string;
  provider: string;
  providerEnvironment: string | null;
}

interface PrismaExternalSyncStateRecord {
  id: string;
  lastError: string | null;
  lastPayloadFingerprint: string | null;
  lastSuccessfulSyncedAt: Date | null;
  lastSyncedAt: Date | null;
  projectExternalLinkId: string;
  syncStatus: 'FAILED' | 'IDLE' | 'PARTIAL' | 'RUNNING' | 'SUCCEEDED';
}

export class ProjectRegistryPrismaMapper {
  public static toDomainProject(record: PrismaProjectRecord): Project {
    const project = Project.create(
      {
        archivedAt: record.archivedAt ?? undefined,
        clientId: record.clientId ?? undefined,
        deliveryManagerId: record.deliveryManagerId
          ? PersonId.from(record.deliveryManagerId)
          : undefined,
        description: record.description ?? undefined,
        domain: record.domain ?? undefined,
        endsOn: record.endsOn ?? undefined,
        engagementModel: (record.engagementModel as any) ?? undefined,
        lessonsLearned: record.lessonsLearned ?? undefined,
        name: record.name,
        outcomeRating: record.outcomeRating ?? undefined,
        priority: (record.priority as any) ?? undefined,
        projectCode: record.projectCode,
        projectManagerId: record.projectManagerId
          ? PersonId.from(record.projectManagerId)
          : undefined,
        projectType: record.projectType ?? undefined,
        startsOn: record.startsOn ?? undefined,
        status: record.status,
        tags: record.tags ?? [],
        techStack: record.techStack ?? [],
        version: record.version ?? 1,
        wouldStaffSameWay: record.wouldStaffSameWay ?? undefined,
      },
      ProjectId.from(record.id),
    );

    return project;
  }

  public static toDomainExternalLink(record: PrismaProjectExternalLinkRecord): ProjectExternalLink {
    return ProjectExternalLink.create(
      {
        archivedAt: record.archivedAt ?? undefined,
        connectionKey: record.connectionKey ?? undefined,
        externalProjectKey: ExternalProjectKey.from(record.externalProjectKey),
        externalProjectName: record.externalProjectName ?? undefined,
        externalUrl: record.externalUrl ?? undefined,
        projectId: ProjectId.from(record.projectId),
        providerEnvironment: record.providerEnvironment ?? undefined,
        systemType: ExternalSystemType.create(record.provider),
      },
      record.id,
    );
  }

  public static toDomainExternalSyncState(
    record: PrismaExternalSyncStateRecord,
  ): ExternalSyncState {
    return ExternalSyncState.create(
      {
        lastError: record.lastError ?? undefined,
        lastPayloadFingerprint: record.lastPayloadFingerprint ?? undefined,
        lastSuccessfulSyncedAt: record.lastSuccessfulSyncedAt ?? undefined,
        lastSyncedAt: record.lastSyncedAt ?? undefined,
        projectExternalLinkId: record.projectExternalLinkId,
        syncStatus: record.syncStatus,
      },
      record.id,
    );
  }
}
