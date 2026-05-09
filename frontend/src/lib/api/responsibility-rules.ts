import { httpDelete, httpGet, httpPatch, httpPost } from './http-client';

// HD-4 — admin client for the responsibility-rule matrix.

export type ResponsibilityActionKind =
  | 'PROJECT_ACTIVATION_APPROVAL'
  | 'BUDGET_CHANGE_APPROVAL'
  | 'ASSIGNMENT_DIRECTOR_APPROVAL'
  | 'ASSIGNMENT_OVERRIDE_APPROVAL'
  | 'PERSON_RELEASE_HR_APPROVAL'
  | 'PERSON_RELEASE_DIRECTOR_APPROVAL'
  | 'PROJECT_CLOSE_APPROVAL';

export type ResponsibilityScope =
  | 'TENANT'
  | 'ORG_UNIT'
  | 'CLIENT'
  | 'PROJECT'
  | 'PROJECT_TYPE'
  | 'THRESHOLD_AMOUNT'
  | 'ROLE_GRADE';

export type ResponsibilityMode = 'ROLE' | 'PERSON' | 'PM_SOLO' | 'SKIP';

export interface ResponsibilityRule {
  id: string;
  actionKind: ResponsibilityActionKind;
  scopeKind: ResponsibilityScope;
  scopeValue: string | null;
  mode: ResponsibilityMode;
  targetRole: string | null;
  targetPersonId: string | null;
  priority: number;
  isActive: boolean;
  notes: string | null;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  isSeededDefault: boolean;
}

export interface CreateResponsibilityRuleRequest {
  actionKind: ResponsibilityActionKind;
  scopeKind: ResponsibilityScope;
  scopeValue?: string | null;
  mode: ResponsibilityMode;
  targetRole?: string | null;
  targetPersonId?: string | null;
  priority?: number;
  notes?: string;
  tenantId?: string | null;
}

export interface UpdateResponsibilityRuleRequest {
  mode?: ResponsibilityMode;
  targetRole?: string | null;
  targetPersonId?: string | null;
  priority?: number;
  isActive?: boolean;
  notes?: string | null;
}

export const RESPONSIBILITY_ACTION_KINDS: ResponsibilityActionKind[] = [
  'PROJECT_ACTIVATION_APPROVAL',
  'BUDGET_CHANGE_APPROVAL',
  'ASSIGNMENT_DIRECTOR_APPROVAL',
  'ASSIGNMENT_OVERRIDE_APPROVAL',
  'PERSON_RELEASE_HR_APPROVAL',
  'PERSON_RELEASE_DIRECTOR_APPROVAL',
  'PROJECT_CLOSE_APPROVAL',
];

export const RESPONSIBILITY_SCOPES: ResponsibilityScope[] = [
  'TENANT',
  'ORG_UNIT',
  'CLIENT',
  'PROJECT',
  'PROJECT_TYPE',
  'THRESHOLD_AMOUNT',
  'ROLE_GRADE',
];

export const RESPONSIBILITY_MODES: ResponsibilityMode[] = ['ROLE', 'PERSON', 'PM_SOLO', 'SKIP'];

export const ACTION_KIND_LABELS: Record<ResponsibilityActionKind, string> = {
  PROJECT_ACTIVATION_APPROVAL: 'Project activation',
  BUDGET_CHANGE_APPROVAL: 'Budget change',
  ASSIGNMENT_DIRECTOR_APPROVAL: 'Assignment (Director)',
  ASSIGNMENT_OVERRIDE_APPROVAL: 'Assignment override',
  PERSON_RELEASE_HR_APPROVAL: 'Person release (HR slot)',
  PERSON_RELEASE_DIRECTOR_APPROVAL: 'Person release (Director slot)',
  PROJECT_CLOSE_APPROVAL: 'Project close',
};

export const SCOPE_LABELS: Record<ResponsibilityScope, string> = {
  TENANT: 'Tenant (default)',
  ORG_UNIT: 'Org unit',
  CLIENT: 'Client',
  PROJECT: 'Project',
  PROJECT_TYPE: 'Project type',
  THRESHOLD_AMOUNT: 'Threshold amount',
  ROLE_GRADE: 'Role grade',
};

export const MODE_LABELS: Record<ResponsibilityMode, string> = {
  ROLE: 'Role',
  PERSON: 'Specific person',
  PM_SOLO: 'PM solo (auto-approve)',
  SKIP: 'Skip approval',
};

export async function listResponsibilityRules(filter?: {
  actionKind?: ResponsibilityActionKind;
  includeArchived?: boolean;
}): Promise<ResponsibilityRule[]> {
  const params = new URLSearchParams();
  if (filter?.actionKind) params.set('actionKind', filter.actionKind);
  if (filter?.includeArchived) params.set('includeArchived', 'true');
  const qs = params.toString();
  return httpGet<ResponsibilityRule[]>(
    `/admin/responsibility-rules${qs ? `?${qs}` : ''}`,
  );
}

export async function createResponsibilityRule(
  data: CreateResponsibilityRuleRequest,
): Promise<ResponsibilityRule> {
  return httpPost<ResponsibilityRule, CreateResponsibilityRuleRequest>(
    '/admin/responsibility-rules',
    data,
  );
}

export async function updateResponsibilityRule(
  id: string,
  data: UpdateResponsibilityRuleRequest,
): Promise<ResponsibilityRule> {
  return httpPatch<ResponsibilityRule, UpdateResponsibilityRuleRequest>(
    `/admin/responsibility-rules/${id}`,
    data,
  );
}

export async function archiveResponsibilityRule(id: string): Promise<ResponsibilityRule> {
  return httpDelete<ResponsibilityRule>(`/admin/responsibility-rules/${id}`);
}
