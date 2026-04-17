import { parseJql, type FilterClause, type FilterGroup } from './jql-parser';

export interface JqlFilters {
  kind: string;
  person: string;
  project: string;
  status: string;
  priority: string;
  role: string;
  allocMin: string;
  allocMax: string;
  poolId: string;
  orgUnitId: string;
  skills: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: JqlFilters = {
  kind: '', person: '', project: '', status: '', priority: '',
  role: '', allocMin: '', allocMax: '', poolId: '', orgUnitId: '',
  skills: '', from: '', to: '',
};

/**
 * Translate a JQL string into filter params.
 * Only AND clauses at the top level are supported for filter translation.
 * OR groups and nested groups are best-effort (first clause wins).
 */
export function jqlToFilters(jql: string): JqlFilters {
  if (!jql.trim()) return { ...EMPTY_FILTERS };

  try {
    const group = parseJql(jql);
    const filters = { ...EMPTY_FILTERS };
    applyGroup(group, filters);
    return filters;
  } catch {
    return { ...EMPTY_FILTERS };
  }
}

function applyGroup(group: FilterGroup, filters: JqlFilters): void {
  for (const clause of group.clauses) {
    if ('field' in clause) {
      applyClause(clause, filters);
    } else {
      applyGroup(clause, filters);
    }
  }
}

function applyClause(clause: FilterClause, filters: JqlFilters): void {
  const { field, operator, value } = clause;
  const strValue = Array.isArray(value) ? value.join(',') : (value ?? '');

  switch (field) {
    case 'kind':
      if (operator === '=' || operator === '~') filters.kind = strValue.toLowerCase();
      break;
    case 'person':
      if (operator === '~' || operator === '=') filters.person = strValue;
      break;
    case 'project':
      if (operator === '~' || operator === '=') filters.project = strValue;
      break;
    case 'status':
      if (operator === '=' || operator === 'IN') filters.status = strValue.toUpperCase();
      break;
    case 'priority':
      if (operator === '=' || operator === 'IN') filters.priority = strValue.toUpperCase();
      break;
    case 'role':
      if (operator === '~' || operator === '=') filters.role = strValue;
      break;
    case 'skills':
      if (operator === '~' || operator === '=') filters.skills = strValue;
      break;
    case 'allocation':
      if (operator === '>' || operator === '>=') filters.allocMin = strValue;
      if (operator === '<' || operator === '<=') filters.allocMax = strValue;
      if (operator === '=') { filters.allocMin = strValue; filters.allocMax = strValue; }
      break;
    case 'pool':
      filters.poolId = strValue;
      break;
    case 'orgUnit':
      filters.orgUnitId = strValue;
      break;
    case 'startDate':
      if (operator === '>=' || operator === '>') filters.from = strValue;
      if (operator === '<=' || operator === '<') filters.to = strValue;
      break;
    case 'endDate':
      if (operator === '<=' || operator === '<') filters.to = strValue;
      if (operator === '>=' || operator === '>') filters.from = strValue;
      break;
    case 'personId':
      // Not directly mapped to standard filters — skip
      break;
    case 'projectId':
      filters.project = strValue;
      break;
  }
}
