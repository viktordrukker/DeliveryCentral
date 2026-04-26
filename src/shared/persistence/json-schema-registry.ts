import { z, type ZodTypeAny } from 'zod';

/**
 * DM-7-7 — JSON-column schema registry.
 *
 * Every `jsonb` column in the DB is registered here with a Zod schema.
 * Services validate payloads at the application boundary before
 * `create()` / `update()` fires. A single place lists the known columns
 * so operators can see what validation is in force and what still needs
 * attention.
 *
 * Usage:
 *   import { validateJsonPayload } from '@src/shared/persistence/json-schema-registry';
 *   const safe = validateJsonPayload('DomainEvent.payload', incoming);
 *
 * Strict mode (DM-7-7 enforcement cutover — follow-up PR): every
 * write path routes through validateJsonPayload; unregistered columns
 * fail CI. Today the registry is opt-in; unlisted columns skip
 * validation.
 *
 * pg_jsonschema (optional, requires the extension) can enforce the
 * same schema at the DB level for belt-and-braces; that's a DM-7-7b
 * follow-up, gated on dev operator installing the extension.
 */

// Generic schemas reused by multiple columns.
const metadataSchema = z.record(z.string(), z.any());

const domainEventPayloadSchema = z.object({
  before: z.record(z.string(), z.any()).optional(),
  after: z.record(z.string(), z.any()).optional(),
  reason: z.string().optional(),
  changedFields: z.array(z.string()).optional(),
}).passthrough();

const auditLogPayloadSchema = metadataSchema;

const assignmentSnapshotSchema = z.object({
  personId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  status: z.string(),
  allocationPercent: z.number().optional(),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
}).passthrough();

/** Map `<Table>.<Column>` → Zod schema. */
export const JSON_SCHEMA_REGISTRY: Record<string, ZodTypeAny> = Object.freeze({
  'DomainEvent.payload': domainEventPayloadSchema,
  'AuditLog.payload': auditLogPayloadSchema,
  'OutboxEvent.payload': auditLogPayloadSchema,
  'AssignmentHistory.previousSnapshot': assignmentSnapshotSchema.nullable(),
  'AssignmentHistory.newSnapshot': assignmentSnapshotSchema.nullable(),
  'EmployeeActivityEvent.metadata': metadataSchema.nullable(),
  'CaseRecord.payload': metadataSchema,
  'CaseStep.payload': metadataSchema,
  'CustomFieldValue.value': z.any(),              // domain-defined shape; loose.
  'NotificationRequest.payload': metadataSchema,
  'NotificationChannel.config': metadataSchema,
  'WorkEvidence.details': metadataSchema,
  'WorkEvidence.trace': metadataSchema.nullable(),
});

export class JsonSchemaValidationError extends Error {
  public constructor(
    public readonly column: string,
    public readonly zodMessage: string,
  ) {
    super(`DM-7-7: invalid JSON for column "${column}" — ${zodMessage}`);
    this.name = 'JsonSchemaValidationError';
  }
}

/**
 * Validate `payload` against the registered Zod schema for `column`.
 * Returns the parsed value (Zod may coerce). Unregistered columns are
 * a no-op in permissive mode; in strict mode (DM-7-7 enforcement
 * cutover) they raise.
 */
export function validateJsonPayload<T = unknown>(
  column: string,
  payload: unknown,
  options: { strict?: boolean } = {},
): T {
  const schema = JSON_SCHEMA_REGISTRY[column];
  if (!schema) {
    if (options.strict) {
      throw new JsonSchemaValidationError(column, 'no Zod schema registered');
    }
    return payload as T;
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new JsonSchemaValidationError(column, result.error.message);
  }
  return result.data as T;
}

/** List every column that has a schema registered (for ops dashboards). */
export function listRegisteredColumns(): string[] {
  return Object.keys(JSON_SCHEMA_REGISTRY);
}
