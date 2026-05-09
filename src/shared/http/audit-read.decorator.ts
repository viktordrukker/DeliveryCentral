import { SetMetadata } from '@nestjs/common';

// HD-0.7 — `@AuditRead` decorator. Marks a controller method as a
// PII-revealing read so the matching interceptor can append an audit
// row every time the endpoint runs successfully. See doctrine in
// `docs/architecture/audit-vs-activity.md` — read-side reveals are
// the one category of NON-mutating action that still needs an
// AuditLog entry (e.g., HR opens someone's compensation tab).

export const AUDIT_READ_KEY = 'audit_read';

export interface AuditReadMetadata {
  // Stable action name written to AuditLog.actionType.
  // Convention: dot-separated, lowercase, ends with `.read`.
  // Example: `person.compensation.read`, `assignment.cost_rate.read`.
  actionType: string;

  // Category lines up with AuditLogRecord.category enum literals
  // (organization | financial | assignment | identity | …).
  category: string;

  // Aggregate the audit row points at. Read from a request
  // path/query parameter when given, else from the principal.
  targetEntity: {
    // The aggregate type (e.g. `PERSON`, `ASSIGNMENT`).
    entityType: string;
    // Source for the aggregate ID — `param:<name>` for path/query
    // params, `principal` for the caller's own personId, or the
    // literal string `body:<jsonpath>` for body fields.
    idFrom:
      | { kind: 'param'; name: string }
      | { kind: 'principal' }
      | { kind: 'body'; path: string };
  };

  // Optional human-readable summary template. Substituted lazily
  // at audit time using metadata bag values.
  summary?: string;
}

export function AuditRead(metadata: AuditReadMetadata) {
  return SetMetadata(AUDIT_READ_KEY, metadata);
}
