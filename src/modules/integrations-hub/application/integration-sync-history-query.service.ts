import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { AuditLogRecord } from '@src/modules/audit-observability/application/audit-log-record';

import { IntegrationSyncHistoryItemDto } from './contracts/integration-sync-history.dto';

type IntegrationProvider = 'jira' | 'm365' | 'radius';

@Injectable()
export class IntegrationSyncHistoryQueryService {
  public constructor(private readonly auditLogger: AuditLoggerService) {}

  public listRecent(query?: {
    limit?: number;
    provider?: IntegrationProvider;
  }): IntegrationSyncHistoryItemDto[] {
    const boundedLimit = Math.min(Math.max(query?.limit ?? 10, 1), 50);

    return this.auditLogger
      .list({
        actionType: 'integration.sync_run',
        limit: 200,
        targetEntityType: 'INTEGRATION_SYNC',
      })
      .items.map((record) => this.mapRecord(record))
      .filter((item): item is IntegrationSyncHistoryItemDto => item !== null)
      .filter((item) => !query?.provider || item.integrationType === query.provider)
      .slice(0, boundedLimit);
  }

  private mapRecord(record: AuditLogRecord): IntegrationSyncHistoryItemDto | null {
    const provider = this.readProvider(record);
    const status = this.readStatus(record);

    if (!provider || !status) {
      return null;
    }

    return {
      ...(this.readFailureSummary(record)
        ? { failureSummary: this.readFailureSummary(record) }
        : {}),
      finishedAt: this.readFinishedAt(record),
      integrationType: provider,
      ...(this.readItemsProcessedSummary(record)
        ? { itemsProcessedSummary: this.readItemsProcessedSummary(record) }
        : {}),
      resourceType: this.readString(record, 'resourceType') ?? 'unknown',
      ...(this.readStartedAt(record) ? { startedAt: this.readStartedAt(record) } : {}),
      status,
      summary: record.changeSummary ?? `${provider} sync ${status.toLowerCase()}.`,
    };
  }

  private readProvider(record: AuditLogRecord): IntegrationProvider | null {
    const value = this.readString(record, 'provider');
    if (value === 'jira' || value === 'm365' || value === 'radius') {
      return value;
    }

    return null;
  }

  private readStatus(record: AuditLogRecord): 'FAILED' | 'SUCCEEDED' | null {
    const value = this.readString(record, 'status');
    if (value === 'FAILED' || value === 'SUCCEEDED') {
      return value;
    }

    return null;
  }

  private readStartedAt(record: AuditLogRecord): string | undefined {
    return this.readString(record, 'startedAt');
  }

  private readFinishedAt(record: AuditLogRecord): string {
    return this.readString(record, 'finishedAt') ?? record.occurredAt;
  }

  private readFailureSummary(record: AuditLogRecord): string | undefined {
    return this.readString(record, 'errorMessage');
  }

  private readItemsProcessedSummary(record: AuditLogRecord): string | undefined {
    const provider = this.readProvider(record);
    if (!provider) {
      return undefined;
    }

    switch (provider) {
      case 'jira': {
        const created = this.readNumber(record, 'projectsCreated');
        const updated = this.readNumber(record, 'projectsUpdated');
        if (created === undefined && updated === undefined) {
          return undefined;
        }
        return `Created ${created ?? 0}, updated ${updated ?? 0}.`;
      }
      case 'm365': {
        const employeesCreated = this.readNumber(record, 'employeesCreated');
        const employeesLinked = this.readNumber(record, 'employeesLinked');
        const managerMappingsResolved = this.readNumber(record, 'managerMappingsResolved');
        if (
          employeesCreated === undefined &&
          employeesLinked === undefined &&
          managerMappingsResolved === undefined
        ) {
          return undefined;
        }
        return `Created ${employeesCreated ?? 0}, linked ${employeesLinked ?? 0}, resolved ${managerMappingsResolved ?? 0} managers.`;
      }
      case 'radius': {
        const accountsImported = this.readNumber(record, 'accountsImported');
        const accountsLinked = this.readNumber(record, 'accountsLinked');
        const unmatchedAccounts = this.readNumber(record, 'unmatchedAccounts');
        if (
          accountsImported === undefined &&
          accountsLinked === undefined &&
          unmatchedAccounts === undefined
        ) {
          return undefined;
        }
        return `Imported ${accountsImported ?? 0}, linked ${accountsLinked ?? 0}, unmatched ${unmatchedAccounts ?? 0}.`;
      }
    }
  }

  private readString(record: AuditLogRecord, key: string): string | undefined {
    const metadataValue = record.metadata[key];
    if (typeof metadataValue === 'string' && metadataValue.trim().length > 0) {
      return metadataValue;
    }

    const detailsValue = record.details[key];
    if (typeof detailsValue === 'string' && detailsValue.trim().length > 0) {
      return detailsValue;
    }

    return undefined;
  }

  private readNumber(record: AuditLogRecord, key: string): number | undefined {
    const metadataValue = record.metadata[key];
    if (typeof metadataValue === 'number' && Number.isFinite(metadataValue)) {
      return metadataValue;
    }

    const detailsValue = record.details[key];
    if (typeof detailsValue === 'number' && Number.isFinite(detailsValue)) {
      return detailsValue;
    }

    return undefined;
  }
}

