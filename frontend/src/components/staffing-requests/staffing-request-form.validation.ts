export interface StaffingRequestFormValues {
  projectId: string;
  role: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  allocationPercent: number | null;
  startDate: string;
  endDate: string;
  skills: string[];
  summary: string;
  /** When true the PM has someone in mind; the rm proposal builder pre-seeds rank #1. */
  candidateKnown: boolean;
  candidatePersonId: string;
}

export type StaffingRequestFormErrors = Partial<
  Record<keyof StaffingRequestFormValues, string>
>;

export interface ValidateResult {
  ok: boolean;
  errors: StaffingRequestFormErrors;
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export function validateStaffingRequestForm(values: StaffingRequestFormValues): ValidateResult {
  const errors: StaffingRequestFormErrors = {};

  if (!values.projectId.trim()) {
    errors.projectId = 'Project is required.';
  }

  if (!values.role.trim()) {
    errors.role = 'Role is required.';
  }

  if (!PRIORITIES.includes(values.priority as (typeof PRIORITIES)[number])) {
    errors.priority = 'Pick a priority.';
  }

  if (
    values.allocationPercent === null ||
    Number.isNaN(values.allocationPercent) ||
    values.allocationPercent < 1 ||
    values.allocationPercent > 100
  ) {
    errors.allocationPercent = 'Allocation must be a number between 1 and 100.';
  }

  if (!values.startDate) {
    errors.startDate = 'Start date is required.';
  }

  if (!values.endDate) {
    errors.endDate = 'End date is required.';
  }

  if (
    values.startDate &&
    values.endDate &&
    new Date(values.startDate) > new Date(values.endDate)
  ) {
    errors.endDate = 'End date must be on or after the start date.';
  }

  if (values.summary && values.summary.length > 2000) {
    errors.summary = 'Summary must be 2000 characters or fewer.';
  }

  if (values.candidateKnown && !values.candidatePersonId) {
    errors.candidatePersonId = 'Pick a candidate or uncheck "Candidate is known".';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
