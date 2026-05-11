import { Injectable, Logger } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditLogRecord } from '../application/audit-log-record';

/**
 * Sprint F-0.3 (B-02 root cause fix) — translates free-form `targetEntityType`
 * strings used by writers (`'EMPLOYEE'`, `'PROJECT'`, `'ASSIGNMENT'`, ...) to
 * the canonical `AggregateType` enum values.
 *
 * Before this fix the cast `record.targetEntityType as $Enums.AggregateType`
 * silently failed at the Postgres enum coercion, the .catch() swallowed the
 * error, and AuditLog stayed empty (verified 2026-05-10: 0 rows in DB despite
 * 200+ persons + 45 projects + 332 assignments seeded).
 *
 * Maintain this map as a closed set. New aggregate types added to the schema
 * must be added here too — the `check-flags.cjs`-style consistency rule for
 * audit-log writers is a follow-up item (F-1.x ratchet).
 */
const AGGREGATE_TYPE_ALIASES: Record<string, $Enums.AggregateType> = {
  // Person-flavored
  PERSON: $Enums.AggregateType.Person,
  EMPLOYEE: $Enums.AggregateType.Person,
  PEOPLE: $Enums.AggregateType.Person,

  // Org-flavored
  ORG_UNIT: $Enums.AggregateType.OrgUnit,
  ORGUNIT: $Enums.AggregateType.OrgUnit,
  REPORTING_LINE: $Enums.AggregateType.OrgUnit,
  TEAM: $Enums.AggregateType.OrgUnit,

  // Resource Pool
  RESOURCE_POOL: $Enums.AggregateType.ResourcePool,

  // Project-flavored
  PROJECT: $Enums.AggregateType.Project,
  PROJECT_BUDGET: $Enums.AggregateType.ProjectBudget,
  PROJECT_RAG_SNAPSHOT: $Enums.AggregateType.ProjectRagSnapshot,
  PROJECT_RADIATOR: $Enums.AggregateType.ProjectRadiatorOverride,
  PROJECT_RADIATOR_OVERRIDE: $Enums.AggregateType.ProjectRadiatorOverride,
  PROJECT_RISK: $Enums.AggregateType.ProjectRisk,
  PROJECT_CHANGE_REQUEST: $Enums.AggregateType.ProjectChangeRequest,
  PROJECT_MILESTONE: $Enums.AggregateType.ProjectMilestone,
  BUDGET_APPROVAL: $Enums.AggregateType.BudgetApproval,

  // Assignment-flavored
  ASSIGNMENT: $Enums.AggregateType.ProjectAssignment,
  PROJECT_ASSIGNMENT: $Enums.AggregateType.ProjectAssignment,

  // Staffing
  STAFFING_REQUEST: $Enums.AggregateType.StaffingRequest,

  // Cases
  CASE: $Enums.AggregateType.CaseRecord,
  CASE_RECORD: $Enums.AggregateType.CaseRecord,

  // Time
  TIMESHEET_WEEK: $Enums.AggregateType.TimesheetWeek,
  TIMESHEET: $Enums.AggregateType.TimesheetWeek,
  PERIOD_LOCK: $Enums.AggregateType.PeriodLock,
  LEAVE_REQUEST: $Enums.AggregateType.LeaveRequest,

  // Notifications
  NOTIFICATION: $Enums.AggregateType.Notification,
  NOTIFICATION_REQUEST: $Enums.AggregateType.Notification,

  // Tenant + integration
  TENANT: $Enums.AggregateType.Tenant,
  CLIENT: $Enums.AggregateType.Client,
  VENDOR: $Enums.AggregateType.Vendor,

  // Skills
  SKILL: $Enums.AggregateType.Skill,
  PERSON_SKILL: $Enums.AggregateType.Skill,

  // Cost rates
  PERSON_COST_RATE: $Enums.AggregateType.PersonCostRate,
  RATE_CARD: $Enums.AggregateType.PersonCostRate,
  RATE_CARD_ENTRY: $Enums.AggregateType.PersonCostRate,

  // Employment events
  EMPLOYMENT_EVENT: $Enums.AggregateType.EmploymentEvent,

  // Contact
  CONTACT: $Enums.AggregateType.Contact,

  // Domain events / unmapped fall-through
  DOMAIN_EVENT: $Enums.AggregateType.DomainEvent,
  INTEGRATION_SYNC: $Enums.AggregateType.DomainEvent,
  METADATA_DICTIONARY: $Enums.AggregateType.DomainEvent,
  RESPONSIBILITY_RULE: $Enums.AggregateType.DomainEvent,

  // Migration
  MIGRATION: $Enums.AggregateType.Migration,
};

/**
 * Resolve a free-form `targetEntityType` to the canonical AggregateType enum.
 * Tries (in order): exact PascalCase match against the enum, alias map lookup,
 * fallback to `DomainEvent` so the audit row still lands.
 */
function resolveAggregateType(raw: string | null | undefined): $Enums.AggregateType {
  if (!raw) return $Enums.AggregateType.DomainEvent;
  // Exact PascalCase match first (covers writers that already pass canonical).
  if ((Object.values($Enums.AggregateType) as string[]).includes(raw)) {
    return raw as $Enums.AggregateType;
  }
  const upper = raw.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  return AGGREGATE_TYPE_ALIASES[upper] ?? $Enums.AggregateType.DomainEvent;
}

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sprint F-0.3 (B-02 secondary fix) — `AuditLog.aggregateId` is UUID-typed
 * in Postgres but writers pass non-UUID identifiers (PlatformSetting keys
 * like `general.platformName`, dictionary entry slugs, etc.). The previous
 * silent .catch() hid this; the new warn log surfaced it.
 *
 * If the raw id isn't UUID-shaped, return ZERO_UUID and let the caller
 * stash the original in the payload (forensic traceability).
 */
function coerceUuid(raw: string | null | undefined): { uuid: string; preserved: string | null } {
  if (!raw) return { uuid: ZERO_UUID, preserved: null };
  if (UUID_RE.test(raw)) return { uuid: raw, preserved: null };
  return { uuid: ZERO_UUID, preserved: raw };
}

@Injectable()
export class PrismaAuditLogStore {
  private readonly logger = new Logger(PrismaAuditLogStore.name);
  private writeFailures = 0;

  public constructor(private readonly prisma: PrismaService) {}

  public append(record: AuditLogRecord): void {
    this.appendToCache(record);
    const aggregateType = resolveAggregateType(record.targetEntityType);
    const { uuid: aggregateId, preserved: rawAggregateId } = coerceUuid(
      record.targetEntityId ?? record.subjectId,
    );
    void this.prisma.auditLog
      .create({
        data: {
          aggregateType,
          aggregateId,
          eventName: record.actionType,
          actorId: record.actorId ?? null,
          correlationId: record.correlationId ?? null,
          payload: {
            action: record.action,
            category: record.category,
            changeSummary: record.changeSummary ?? null,
            details: record.details as Prisma.InputJsonValue,
            metadata: record.metadata as Prisma.InputJsonValue,
            occurredAt: record.occurredAt,
            oldValues: (record.oldValues ?? null) as Prisma.InputJsonValue | null,
            newValues: (record.newValues ?? null) as Prisma.InputJsonValue | null,
            subjectId: record.subjectId ?? null,
            // Preserve the original free-form type for forensic traceability
            // when the alias map didn't match exactly (we fell back to DomainEvent).
            originalTargetEntityType: record.targetEntityType ?? null,
            // Preserve non-UUID aggregateId (e.g. PlatformSetting key) for
            // forensic traceability when we coerced to ZERO_UUID.
            rawAggregateId,
          } as Prisma.InputJsonValue,
        },
      })
      .catch((error: unknown) => {
        // Audit logging must never break the caller, but the error must be
        // visible — Phase 4 walker logged "0 audit records" because the
        // previous silent .catch() swallowed every Postgres rejection.
        this.writeFailures += 1;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `AuditLog write failed for actionType=${record.actionType} targetEntityType=${record.targetEntityType}: ${message} (cumulative failures=${this.writeFailures})`,
        );
      });
  }

  public list(query?: {
    actionType?: string;
    actorId?: string;
    from?: string;
    limit?: number;
    page?: number;
    pageSize?: number;
    targetEntityId?: string;
    targetEntityType?: string;
    to?: string;
  }): { items: AuditLogRecord[]; totalCount: number } {
    // This method is synchronous in the interface contract (InMemoryAuditLogStore).
    // For backward compatibility we keep the synchronous signature and return
    // an empty result set. Callers that need Prisma-backed reads should use
    // the async listAsync method instead.
    //
    // The health service and audit-logger currently call this synchronously.
    // We maintain runtime compatibility by also populating an in-memory cache
    // on each append so list() still works identically to the old store.
    return this.listFromCache(query);
  }

  // ---- In-memory cache for synchronous list() compatibility ----
  private readonly cache: AuditLogRecord[] = [];

  private appendToCache(record: AuditLogRecord): void {
    this.cache.push(record);
    if (this.cache.length > 5000) {
      this.cache.splice(0, this.cache.length - 5000);
    }
  }

  private listFromCache(query?: {
    actionType?: string;
    actorId?: string;
    from?: string;
    limit?: number;
    page?: number;
    pageSize?: number;
    targetEntityId?: string;
    targetEntityType?: string;
    to?: string;
  }): { items: AuditLogRecord[]; totalCount: number } {
    let items = [...this.cache];

    if (query?.actorId) {
      items = items.filter((item) => item.actorId === query.actorId);
    }

    if (query?.actionType) {
      items = items.filter((item) => item.actionType === query.actionType);
    }

    if (query?.targetEntityType) {
      items = items.filter((item) => item.targetEntityType === query.targetEntityType);
    }

    if (query?.targetEntityId) {
      items = items.filter((item) => item.targetEntityId === query.targetEntityId);
    }

    if (query?.from) {
      const fromMs = new Date(query.from).getTime();
      items = items.filter((item) => new Date(item.occurredAt).getTime() >= fromMs);
    }

    if (query?.to) {
      const toMs = new Date(query.to).getTime();
      items = items.filter((item) => new Date(item.occurredAt).getTime() <= toMs);
    }

    items.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

    const totalCount = items.length;

    if (query?.pageSize && query.pageSize > 0) {
      const page = Math.max(1, query.page ?? 1);
      const offset = (page - 1) * query.pageSize;
      items = items.slice(offset, offset + query.pageSize);
    } else if (query?.limit && query.limit > 0) {
      items = items.slice(0, query.limit);
    }

    return { items, totalCount };
  }

  public clear(): void {
    this.cache.splice(0, this.cache.length);
  }
}
