import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

// HD-4 — `ResponsibilityResolver` (J4). Reads `responsibility_rules`
// and answers "who is responsible for action X right now in this
// context?" with a typed verdict.
//
// Resolution algorithm:
//   1. For each non-TENANT scope present in the input context (e.g.
//      project, client, org_unit, threshold), pull rules whose
//      `(actionKind, scopeKind, scopeValue)` matches.
//   2. Plus pull TENANT-scoped rules (the catch-all).
//   3. Sort everything by (priority asc, updatedAt desc) and pick the
//      first row whose `isActive=true`.
//   4. If nothing matches at all, return `{mode: 'ROLE',
//      targetRole: <fallback>, source: 'FALLBACK'}` — callers pass the
//      fallback role they were going to hardcode. This preserves
//      pre-HD-4 behaviour while still threading through the resolver.

export type ResponsibilityActionKind =
  | 'PROJECT_ACTIVATION_APPROVAL'
  | 'BUDGET_CHANGE_APPROVAL'
  | 'ASSIGNMENT_DIRECTOR_APPROVAL'
  | 'ASSIGNMENT_OVERRIDE_APPROVAL'
  | 'PERSON_RELEASE_HR_APPROVAL'
  | 'PERSON_RELEASE_DIRECTOR_APPROVAL'
  | 'PROJECT_CLOSE_APPROVAL'
  // F-5.3 / D-158 — READ_* coverage. Each GET endpoint declares its
  // entity-scoped read kind via `@ReadAction(kind)`. When the flag
  // `flag.rbac.responsibilityRule.reads.enabled` is ON, the RbacGuard
  // consults `responsibility_rules` rows of these kinds to expand or
  // narrow the static @RequireRoles set per tenant policy. Entity-
  // scoped (not per-route) so the kind set stays small and admin-
  // configurable.
  | 'READ_PROJECT'
  | 'READ_PERSON'
  | 'READ_ASSIGNMENT'
  | 'READ_STAFFING_REQUEST'
  | 'READ_BUDGET'
  | 'READ_TIMESHEET'
  | 'READ_LEAVE'
  | 'READ_OVERTIME'
  | 'READ_CASE'
  | 'READ_DASHBOARD'
  | 'READ_REPORT'
  | 'READ_ORG'
  | 'READ_NOTIFICATION'
  | 'READ_ADMIN'
  | 'READ_METADATA'
  | 'READ_SETTINGS'
  | 'READ_EXCEPTION'
  | 'READ_PULSE'
  | 'READ_HELP'
  | 'READ_AUDIT_LOG';

export const READ_ACTION_KINDS = [
  'READ_PROJECT',
  'READ_PERSON',
  'READ_ASSIGNMENT',
  'READ_STAFFING_REQUEST',
  'READ_BUDGET',
  'READ_TIMESHEET',
  'READ_LEAVE',
  'READ_OVERTIME',
  'READ_CASE',
  'READ_DASHBOARD',
  'READ_REPORT',
  'READ_ORG',
  'READ_NOTIFICATION',
  'READ_ADMIN',
  'READ_METADATA',
  'READ_SETTINGS',
  'READ_EXCEPTION',
  'READ_PULSE',
  'READ_HELP',
  'READ_AUDIT_LOG',
] as const;

export type ReadActionKind = (typeof READ_ACTION_KINDS)[number];

export function isReadActionKind(value: string): value is ReadActionKind {
  return (READ_ACTION_KINDS as readonly string[]).includes(value);
}

export type ResponsibilityResolutionMode = 'ROLE' | 'PERSON' | 'PM_SOLO' | 'SKIP';

export interface ResponsibilityContext {
  // Required: the action being routed.
  actionKind: ResponsibilityActionKind;
  // Optional dimensions. The resolver pulls rules matching ANY supplied
  // dimension PLUS tenant-default rules.
  orgUnitId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  projectType?: string | null;
  // Numeric value for THRESHOLD_AMOUNT scope. Rules at this scope match
  // when the configured threshold is ≤ this value (i.e. "above $X").
  amount?: number | null;
  // Grade key for ROLE_GRADE scope (matches if rule's scopeValue equals).
  grade?: string | null;
  // Tenant scoping. NULL means "single-tenant deployment / no scoping".
  tenantId?: string | null;
  // What role to fall back to when no rule matches. Required so the
  // resolver always returns a usable verdict.
  fallbackRole: string;
}

export interface ResponsibilityVerdict {
  mode: ResponsibilityResolutionMode;
  targetRole: string | null;
  targetPersonId: string | null;
  // The rule that fired. Null when `source = 'FALLBACK'`.
  ruleId: string | null;
  source: 'RULE' | 'FALLBACK';
  // Which scope kind matched. Useful for audit + debug.
  matchedScope:
    | 'TENANT'
    | 'ORG_UNIT'
    | 'CLIENT'
    | 'PROJECT'
    | 'PROJECT_TYPE'
    | 'THRESHOLD_AMOUNT'
    | 'ROLE_GRADE'
    | null;
}

interface RuleRow {
  id: string;
  actionKind: ResponsibilityActionKind;
  scopeKind:
    | 'TENANT'
    | 'ORG_UNIT'
    | 'CLIENT'
    | 'PROJECT'
    | 'PROJECT_TYPE'
    | 'THRESHOLD_AMOUNT'
    | 'ROLE_GRADE';
  scopeValue: string | null;
  mode: ResponsibilityResolutionMode;
  targetRole: string | null;
  targetPersonId: string | null;
  priority: number;
  isActive: boolean;
  archivedAt: Date | null;
  updatedAt: Date;
  tenantId: string | null;
}

@Injectable()
export class ResponsibilityResolverService {
  private readonly logger = new Logger(ResponsibilityResolverService.name);

  public constructor(private readonly prisma: PrismaService) {}

  public async resolve(context: ResponsibilityContext): Promise<ResponsibilityVerdict> {
    const candidateScopes: Array<{ kind: RuleRow['scopeKind']; value: string | null }> = [
      { kind: 'TENANT', value: null },
    ];
    if (context.projectId) candidateScopes.push({ kind: 'PROJECT', value: context.projectId });
    if (context.clientId) candidateScopes.push({ kind: 'CLIENT', value: context.clientId });
    if (context.orgUnitId) candidateScopes.push({ kind: 'ORG_UNIT', value: context.orgUnitId });
    if (context.projectType)
      candidateScopes.push({ kind: 'PROJECT_TYPE', value: context.projectType });
    if (context.grade) candidateScopes.push({ kind: 'ROLE_GRADE', value: context.grade });

    const eligibleRules: RuleRow[] = [];

    for (const scope of candidateScopes) {
      const rows = (await this.prisma.responsibilityRule.findMany({
        where: {
          actionKind: context.actionKind as never,
          scopeKind: scope.kind as never,
          scopeValue: scope.value,
          isActive: true,
          archivedAt: null,
          ...this.tenantFilter(context.tenantId),
        },
      })) as unknown as RuleRow[];
      eligibleRules.push(...rows);
    }

    // THRESHOLD_AMOUNT is special — `scopeValue` is the threshold,
    // and the rule fires when amount ≥ scopeValue. Pull all candidate
    // threshold rules and keep the ones that satisfy.
    if (context.amount !== null && context.amount !== undefined) {
      const thresholdRules = (await this.prisma.responsibilityRule.findMany({
        where: {
          actionKind: context.actionKind as never,
          scopeKind: 'THRESHOLD_AMOUNT' as never,
          isActive: true,
          archivedAt: null,
          ...this.tenantFilter(context.tenantId),
        },
      })) as unknown as RuleRow[];
      for (const rule of thresholdRules) {
        const threshold = Number(rule.scopeValue);
        if (Number.isFinite(threshold) && context.amount >= threshold) {
          eligibleRules.push(rule);
        }
      }
    }

    if (eligibleRules.length === 0) {
      return this.fallback(context.fallbackRole);
    }

    eligibleRules.sort((a, b) => {
      // Most-specific scope first when priorities tie. TENANT is the
      // weakest, then ORG_UNIT/CLIENT/PROJECT_TYPE/ROLE_GRADE/THRESHOLD_AMOUNT,
      // then CLIENT, then PROJECT (most specific). The numbers below
      // are deliberately ordinal — only relative order matters.
      const specificity = (kind: RuleRow['scopeKind']): number => {
        switch (kind) {
          case 'PROJECT':
            return 6;
          case 'CLIENT':
            return 5;
          case 'ORG_UNIT':
            return 4;
          case 'PROJECT_TYPE':
            return 3;
          case 'ROLE_GRADE':
            return 3;
          case 'THRESHOLD_AMOUNT':
            return 2;
          case 'TENANT':
            return 1;
        }
      };
      if (a.priority !== b.priority) return a.priority - b.priority; // lower priority number = higher precedence
      const sa = specificity(a.scopeKind);
      const sb = specificity(b.scopeKind);
      if (sa !== sb) return sb - sa; // more specific first
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    const winner = eligibleRules[0];
    return {
      mode: winner.mode,
      targetRole: winner.targetRole,
      targetPersonId: winner.targetPersonId,
      ruleId: winner.id,
      source: 'RULE',
      matchedScope: winner.scopeKind,
    };
  }

  private fallback(role: string): ResponsibilityVerdict {
    return {
      mode: 'ROLE',
      targetRole: role,
      targetPersonId: null,
      ruleId: null,
      source: 'FALLBACK',
      matchedScope: null,
    };
  }

  private tenantFilter(tenantId: string | null | undefined): {
    OR?: Array<{ tenantId: string | null }>;
  } {
    if (tenantId === undefined || tenantId === null) {
      // Single-tenant or omitted — match rules with NULL tenantId only.
      return { OR: [{ tenantId: null }] };
    }
    return { OR: [{ tenantId: null }, { tenantId }] };
  }
}
