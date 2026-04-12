export interface AuditLogRecord {
  action: string;
  actionType: string;
  actorId?: string | null;
  changeSummary?: string | null;
  category:
    | 'assignment'
    | 'approval'
    | 'organization'
    | 'project'
    | 'team'
    | 'metadata'
    | 'integration'
    | 'notification'
    | 'settings'
    | 'skills';
  correlationId?: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  subjectId?: string | null;
  targetEntityId?: string | null;
  targetEntityType: string;
  details: Record<string, unknown>;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}
