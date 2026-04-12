import { ExternalSyncState } from '@src/modules/project-registry/domain/entities/external-sync-state.entity';
import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ProjectExternalLink } from '@src/modules/project-registry/domain/entities/project-external-link.entity';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { ExternalProjectKey } from '@src/modules/project-registry/domain/value-objects/external-project-key';
import { ExternalSystemType } from '@src/modules/project-registry/domain/value-objects/external-system-type';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';

interface PrismaProjectRecord {
  archivedAt: Date | null;
  description: string | null;
  endsOn: Date | null;
  id: string;
  name: string;
  projectManagerId: string | null;
  projectCode: string;
  startsOn: Date | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'CLOSED' | 'COMPLETED' | 'DRAFT' | 'ON_HOLD';
  version?: number | null;
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
        description: record.description ?? undefined,
        endsOn: record.endsOn ?? undefined,
        name: record.name,
        projectManagerId: record.projectManagerId
          ? PersonId.from(record.projectManagerId)
          : undefined,
        projectCode: record.projectCode,
        startsOn: record.startsOn ?? undefined,
        status: record.status,
        version: record.version ?? 1,
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
