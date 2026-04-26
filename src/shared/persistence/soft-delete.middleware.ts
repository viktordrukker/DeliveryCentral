import type { Prisma } from '@prisma/client';

/**
 * DM-8-2 — soft-delete Prisma middleware.
 *
 * Every model that has an `archivedAt` column gets an implicit
 * `WHERE archivedAt IS NULL` filter on `findMany` / `findUnique` /
 * `findFirst` / `count` / `aggregate` / `groupBy` — unless the caller
 * opts out with `{ where: { __includeArchived: true } }`.
 *
 * Delete becomes `update({ archivedAt: NOW() })` for registered models.
 * Hard delete is available via `deleteMany({ where: { __force: true } })`
 * (the caller strips that flag before the DB sees it).
 *
 * The tracked-models list lives here — every model with an `archivedAt`
 * column that participates in the soft-delete pattern. Expand as models
 * opt in.
 */

// Models that have `archivedAt`. Keep in sync with schema.prisma — the
// DM-8-2 integration test walks information_schema to cross-check.
const SOFT_DELETE_MODELS: ReadonlySet<string> = new Set([
  'Person',
  'OrgUnit',
  'Project',
  'ProjectAssignment',
  'CaseRecord',
  'CaseType',
  'Position',
  'ReportingLine',
  'ResourcePool',
  'PersonOrgMembership',
  'PersonResourcePoolMembership',
  'ProjectExternalLink',
  'ExternalAccountLink',
  'PersonExternalIdentityLink',
  'CustomFieldDefinition',
  'CustomFieldValue',
  'EntityLayoutDefinition',
  'MetadataDictionary',
  'MetadataEntry',
  'NotificationTemplate',
]);

const FIND_ACTIONS = new Set<Prisma.PrismaAction>([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

function injectArchivedFilter(where: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!where) return { archivedAt: null };
  // Escape hatch: `{ __includeArchived: true }` keeps both active +
  // archived rows.
  if (where.__includeArchived === true) {
    const { __includeArchived: _drop, ...rest } = where;
    return rest;
  }
  // If the caller already constrained archivedAt, honor it.
  if ('archivedAt' in where) return where;
  return { ...where, archivedAt: null };
}

export function registerSoftDeleteMiddleware(prisma: {
  $use: (middleware: Prisma.Middleware) => void;
}): void {
  const middleware: Prisma.Middleware = async (params, next) => {
    if (!params.model || !SOFT_DELETE_MODELS.has(params.model)) {
      return next(params);
    }

    if (FIND_ACTIONS.has(params.action)) {
      params.args = params.args ?? {};
      params.args.where = injectArchivedFilter(params.args.where as Record<string, unknown> | undefined);
      return next(params);
    }

    // delete → update archivedAt (unless __force).
    if (params.action === 'delete') {
      const where = (params.args?.where ?? {}) as Record<string, unknown>;
      if (where.__force === true) {
        delete where.__force;
        params.args = { ...params.args, where };
        return next(params);
      }
      params.action = 'update';
      params.args = {
        where,
        data: { archivedAt: new Date() },
      };
      return next(params);
    }

    if (params.action === 'deleteMany') {
      const where = (params.args?.where ?? {}) as Record<string, unknown>;
      if (where.__force === true) {
        delete where.__force;
        params.args = { ...params.args, where };
        return next(params);
      }
      params.action = 'updateMany';
      params.args = {
        where: injectArchivedFilter(where),
        data: { archivedAt: new Date() },
      };
      return next(params);
    }

    return next(params);
  };

  prisma.$use(middleware);
}

export const SOFT_DELETE_TRACKED_MODELS: ReadonlySet<string> = SOFT_DELETE_MODELS;
