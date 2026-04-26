#!/usr/bin/env node

/**
 * DeliveryCentral schema-conventions lint (Phase DM-1).
 *
 * Source of truth: docs/planning/schema-conventions.md
 *
 * Rules (each violation carries a stable signature baselined in
 * scripts/schema-convention-baseline.json):
 *   - id-not-uuid              : model id field lacks @db.Uuid (unless whitelisted)
 *   - fk-not-uuid              : *Id field lacks @db.Uuid
 *   - fk-missing-relation      : *Id field has no matching @relation on the model
 *   - relation-ondelete-missing: @relation(fields:[...]) without onDelete:
 *   - datetime-not-timestamptz : DateTime field without @db.Timestamptz (and not @db.Date)
 *   - model-missing-map        : model lacks @@map("snake_case")
 *   - approval-decision-requested: ApprovalDecision enum still contains REQUESTED (one-off)
 *
 * Usage:
 *   node scripts/check-schema-conventions.cjs                (lint)
 *   node scripts/check-schema-conventions.cjs --write-baseline (regenerate baseline)
 */

const fs = require('node:fs');
const path = require('node:path');
const { getSchema } = require('@mrleebo/prisma-ast');

const rootDir = path.resolve(__dirname, '..');
const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
const baselinePath = path.join(__dirname, 'schema-convention-baseline.json');

const shouldWriteBaseline = process.argv.includes('--write-baseline');

// Fields whose TEXT-PK shape is intentional (documented in schema-conventions.md §1 and DMD-015).
const ID_TEXT_PK_WHITELIST = new Set([
  'PlatformSetting.key',
  // DM-6a-1 Currency uses ISO 4217 3-letter code as PK (same rationale as PlatformSetting.key —
  // a dictionary keyed by its natural identifier). Not a uuid, by design.
  'Currency.code',
]);

// Columns that LOOK like FKs (name ends in "Id") but are opaque identifiers from EXTERNAL systems —
// they do not reference any table in our DB. Lint must not flag them as fk-missing-relation or fk-not-uuid.
// Documented in schema-conventions.md §1 note and data-model-decisions.md DMD-007 (polymorphism bounds).
const EXTERNAL_ID_WHITELIST = new Set([
  'AuditLog.correlationId',
  'OutboxEvent.correlationId',
  'NotificationDelivery.providerMessageId',
  'ExternalAccountLink.externalAccountId',
  'M365DirectoryReconciliationRecord.externalUserId',
  'PersonExternalIdentityLink.externalUserId',
  'PersonExternalIdentityLink.externalManagerUserId',
  'RadiusReconciliationRecord.externalAccountId',
]);

// Polymorphic FK columns — the {aggregateType, aggregateId} / {entityType, entityId} pattern.
// Referential integrity for these is enforced by a trigger-based validator in DM-7, not a plain FK.
// Documented in schema-conventions.md §10 (Polymorphic Associations).
const POLYMORPHIC_FK_WHITELIST = new Set([
  'AuditLog.aggregateId',
  'CustomFieldValue.entityId',
  'EmployeeActivityEvent.relatedEntityId',
  'OutboxEvent.aggregateId',
  'UndoAction.entityId',
]);

// Models whose @@map is not required (platform tables where PascalCase is the Postgres name today
// and DM-5 has not yet normalised them).
const NO_MAP_WHITELIST = new Set([
  // intentionally empty — DM-5 will shrink any baseline that fills this in
]);

// Aggregate roots that MUST carry a `publicId` column (DMD-026 / schema-conventions §20).
// This list ramps as DM-2 per-table migrations land the column. Adding a model to this set
// without adding the column to the schema fails CI. Sub-entities (CaseStep, PersonSkill,
// TimesheetEntry, etc.) are addressed via their root's publicId and do NOT appear here.
const AGGREGATE_ROOTS_REQUIRING_PUBLIC_ID = new Set([
  'Skill',
  'PeriodLock',
  'ProjectBudget',
  'PersonCostRate',
  'InAppNotification',
  'LeaveRequest',
  'StaffingRequest',
  'TimesheetWeek',
  // Add future aggregate roots here as DM-2 + DM-2.5 land them:
  //   'Person', 'Tenant', 'Project', 'Client', 'Vendor', 'OrgUnit', 'ResourcePool',
  //   'ProjectAssignment', 'CaseRecord', 'DomainEvent', 'ProjectRisk',
  //   'ProjectRagSnapshot', 'EmploymentEvent', 'Contact', 'BudgetApproval'.
]);

function hasAttribute(field, name, group) {
  return (field.attributes ?? []).some((attr) => {
    if (attr.type !== 'attribute') return false;
    if (attr.name !== name) return false;
    if (group !== undefined && attr.group !== group) return false;
    return true;
  });
}

function getAttribute(field, name, group) {
  return (field.attributes ?? []).find((attr) => {
    if (attr.type !== 'attribute') return false;
    if (attr.name !== name) return false;
    if (group !== undefined && attr.group !== group) return false;
    return true;
  });
}

function isIdField(field) {
  return hasAttribute(field, 'id');
}

function isDbUuid(field) {
  return hasAttribute(field, 'Uuid', 'db');
}

function isDbDate(field) {
  return hasAttribute(field, 'Date', 'db');
}

function isDbTimestamptz(field) {
  return hasAttribute(field, 'Timestamptz', 'db');
}

function getRelationAttribute(field) {
  return getAttribute(field, 'relation');
}

function extractRelationArgs(relationAttr) {
  const args = relationAttr?.args ?? [];
  const named = {};
  let fieldsList = null;
  let referencesList = null;
  for (const arg of args) {
    const value = arg?.value;
    if (!value) continue;
    // KeyValue form: `fields: [personId]` or `onDelete: Restrict`
    if (typeof value === 'object' && value.type === 'keyValue') {
      const key = value.key;
      const v = value.value;
      if (key === 'fields') {
        if (v && v.type === 'array') fieldsList = v.args.map((x) => (typeof x === 'string' ? x : x?.value ?? String(x)));
      } else if (key === 'references') {
        if (v && v.type === 'array') referencesList = v.args.map((x) => (typeof x === 'string' ? x : x?.value ?? String(x)));
      } else {
        named[key] = v;
      }
    }
  }
  return { named, fieldsList, referencesList };
}

function modelHasMap(model) {
  const props = model.properties ?? [];
  return props.some((p) => p.type === 'attribute' && p.name === 'map');
}

function collectModels(schema) {
  return (schema.list ?? []).filter((b) => b.type === 'model');
}

function collectEnums(schema) {
  return (schema.list ?? []).filter((b) => b.type === 'enum');
}

function modelTypeNames(schema) {
  const names = new Set();
  for (const b of schema.list ?? []) {
    if (b.type === 'model' || b.type === 'enum') names.add(b.name);
  }
  return names;
}

function collectRelationFieldSourcesPerModel(model) {
  // Returns a Set of field names used in `fields:` across all @relation attributes on the model.
  const usedAsRelationSource = new Set();
  for (const prop of model.properties ?? []) {
    if (prop.type !== 'field') continue;
    const relationAttr = getRelationAttribute(prop);
    if (!relationAttr) continue;
    const { fieldsList } = extractRelationArgs(relationAttr);
    (fieldsList ?? []).forEach((name) => usedAsRelationSource.add(name));
  }
  return usedAsRelationSource;
}

function signature(model, field, rule) {
  return `${model}.${field}|${rule}`;
}

function lint(schema) {
  const violations = [];
  const models = collectModels(schema);
  const enums = collectEnums(schema);

  for (const model of models) {
    const props = model.properties ?? [];
    const fields = props.filter((p) => p.type === 'field');
    const usedAsRelationSource = collectRelationFieldSourcesPerModel(model);

    // model-missing-map
    if (!modelHasMap(model) && !NO_MAP_WHITELIST.has(model.name)) {
      violations.push({ signature: signature(model.name, '_model', 'model-missing-map'), model: model.name, field: '_model', rule: 'model-missing-map' });
    }

    // public-id-missing — aggregate roots declared in AGGREGATE_ROOTS_REQUIRING_PUBLIC_ID
    // must have a `publicId` field. Ramp by adding entries to that set as DM-2 lands the column.
    if (AGGREGATE_ROOTS_REQUIRING_PUBLIC_ID.has(model.name)) {
      const hasPublicId = fields.some((f) => f.name === 'publicId');
      if (!hasPublicId) {
        violations.push({ signature: signature(model.name, '_model', 'public-id-missing'), model: model.name, field: '_model', rule: 'public-id-missing' });
      }
    }

    for (const field of fields) {
      const fullName = `${model.name}.${field.name}`;

      // id-not-uuid
      if (isIdField(field) && field.fieldType === 'String' && !isDbUuid(field) && !ID_TEXT_PK_WHITELIST.has(fullName)) {
        violations.push({ signature: signature(model.name, field.name, 'id-not-uuid'), model: model.name, field: field.name, rule: 'id-not-uuid' });
      }

      // fk-not-uuid — FK heuristic: ends with "Id" (case-sensitive, not just "id"), String type, not @id.
      // Exempt: `publicId` is a standardized opaque external identifier (DMD-026 / §20),
      // never a foreign key. Same for any field explicitly marked as not an FK via the whitelists.
      const looksLikeFk = field.name !== 'id'
        && field.name !== 'publicId'
        && /Id$/.test(field.name)
        && field.fieldType === 'String'
        && !isIdField(field);
      const isExternalId = EXTERNAL_ID_WHITELIST.has(fullName);
      const isPolymorphic = POLYMORPHIC_FK_WHITELIST.has(fullName);
      if (looksLikeFk && !isDbUuid(field) && !isExternalId) {
        violations.push({ signature: signature(model.name, field.name, 'fk-not-uuid'), model: model.name, field: field.name, rule: 'fk-not-uuid' });
      }

      // fk-missing-relation — FK column without a relation referencing it
      if (looksLikeFk && !usedAsRelationSource.has(field.name) && !isExternalId && !isPolymorphic) {
        violations.push({ signature: signature(model.name, field.name, 'fk-missing-relation'), model: model.name, field: field.name, rule: 'fk-missing-relation' });
      }

      // relation-ondelete-missing — declared relation without onDelete
      const rel = getRelationAttribute(field);
      if (rel) {
        const { named, fieldsList } = extractRelationArgs(rel);
        if (fieldsList && fieldsList.length > 0 && !('onDelete' in named)) {
          violations.push({ signature: signature(model.name, field.name, 'relation-ondelete-missing'), model: model.name, field: field.name, rule: 'relation-ondelete-missing' });
        }
      }

      // datetime-not-timestamptz
      if (field.fieldType === 'DateTime' && !isDbTimestamptz(field) && !isDbDate(field)) {
        violations.push({ signature: signature(model.name, field.name, 'datetime-not-timestamptz'), model: model.name, field: field.name, rule: 'datetime-not-timestamptz' });
      }
    }
  }

  // approval-decision-requested (one-off): flag any enumerator named REQUESTED on ApprovalDecision enum
  const approvalEnum = enums.find((e) => e.name === 'ApprovalDecision');
  if (approvalEnum) {
    const enumerators = approvalEnum.enumerators ?? [];
    if (enumerators.some((e) => (e.type === 'enumerator' || e.type === undefined) && e.name === 'REQUESTED')) {
      violations.push({ signature: 'ApprovalDecision.REQUESTED|approval-decision-requested', model: 'ApprovalDecision', field: 'REQUESTED', rule: 'approval-decision-requested' });
    }
  }

  return violations;
}

function main() {
  if (!fs.existsSync(schemaPath)) {
    console.error(`schema not found: ${schemaPath}`);
    process.exit(2);
  }

  const source = fs.readFileSync(schemaPath, 'utf8');
  const schema = getSchema(source);
  const violations = lint(schema);
  const sortedSignatures = violations.map((v) => v.signature).sort();

  if (shouldWriteBaseline) {
    fs.writeFileSync(baselinePath, `${JSON.stringify(sortedSignatures, null, 2)}\n`);
    console.log(`Wrote ${sortedSignatures.length} baseline schema-convention exceptions to scripts/schema-convention-baseline.json.`);
    process.exit(0);
  }

  const baseline = fs.existsSync(baselinePath)
    ? new Set(JSON.parse(fs.readFileSync(baselinePath, 'utf8')))
    : new Set();

  const newViolations = violations.filter((v) => !baseline.has(v.signature));

  // Also surface baseline entries that no longer exist (baseline shrink opportunity / rename)
  const currentSet = new Set(violations.map((v) => v.signature));
  const staleBaseline = [...baseline].filter((sig) => !currentSet.has(sig));

  if (newViolations.length > 0) {
    console.error('Schema-convention violations (new — not in baseline):');
    for (const v of newViolations) {
      console.error(`  - [${v.rule}] ${v.model}.${v.field}`);
    }
    console.error('');
    console.error('If a violation is intentional, regenerate the baseline with:');
    console.error('  node scripts/check-schema-conventions.cjs --write-baseline');
    console.error('Strongly prefer fixing the violation over baselining it.');
    process.exit(1);
  }

  if (staleBaseline.length > 0) {
    console.log(`Schema-convention baseline has ${staleBaseline.length} stale entries (violation fixed — please rerun --write-baseline to shrink):`);
    for (const sig of staleBaseline) {
      console.log(`  - ${sig}`);
    }
  }

  console.log(`Schema-convention guardrail passed (${violations.length} existing violations baselined).`);
}

main();
