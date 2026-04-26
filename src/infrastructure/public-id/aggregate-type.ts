/**
 * Aggregate-type registry for the Public ID Layer (DM-2.5 / DMD-026).
 *
 * The prefix is the entity-type segment that appears in every publicId
 * (e.g. `prj_2zJ9QfXk`) so operators can tell at a glance which aggregate
 * a publicId belongs to. Keep this list in sync with:
 *   - docs/planning/schema-conventions.md §20 prefix table
 *   - docs/planning/aggregate-map.md
 *   - MODEL_TO_AGGREGATE_TYPE map below
 */
export enum AggregateType {
  Person = 'usr',
  Tenant = 'tnt',
  Project = 'prj',
  Client = 'cli',
  Vendor = 'vnd',
  OrgUnit = 'org',
  ResourcePool = 'pool',
  ProjectAssignment = 'asn',
  StaffingRequest = 'stf',
  CaseRecord = 'case',
  TimesheetWeek = 'tsh',
  LeaveRequest = 'lvr',
  Notification = 'not',
  DomainEvent = 'evt',
  Skill = 'skl',
  PeriodLock = 'prd',
  PersonCostRate = 'pcr',
  ProjectBudget = 'bud',
  ProjectRisk = 'rsk',
  ProjectRagSnapshot = 'rag',
  EmploymentEvent = 'emp',
  Contact = 'ctc',
  BudgetApproval = 'ba',
}

/**
 * Prisma model name → AggregateType. Only the models that currently carry a
 * `publicId` column are listed. Remaining aggregate roots are added as DM-2
 * lands their expand migration + schema edit.
 */
export const MODEL_TO_AGGREGATE_TYPE: Readonly<Record<string, AggregateType>> = Object.freeze({
  Skill: AggregateType.Skill,
  PeriodLock: AggregateType.PeriodLock,
  ProjectBudget: AggregateType.ProjectBudget,
  PersonCostRate: AggregateType.PersonCostRate,
  InAppNotification: AggregateType.Notification,
  LeaveRequest: AggregateType.LeaveRequest,
  StaffingRequest: AggregateType.StaffingRequest,
  TimesheetWeek: AggregateType.TimesheetWeek,
});

/** All registered prefixes, for format-shape validation. */
export const ALL_AGGREGATE_PREFIXES: ReadonlyArray<string> = Object.freeze(
  Object.values(AggregateType),
);

/** Reverse lookup: prefix → AggregateType. */
export function aggregateTypeForPrefix(prefix: string): AggregateType | null {
  const match = ALL_AGGREGATE_PREFIXES.find((p) => p === prefix);
  return match ? (match as AggregateType) : null;
}
