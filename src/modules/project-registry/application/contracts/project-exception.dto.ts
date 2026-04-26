export type ExceptionSeverity = 'amber' | 'red' | 'critical';
export type ExceptionTrigger =
  | 'radiator-axis'
  | 'risk-overdue-review'
  | 'risk-past-due'
  | 'milestone-slipped'
  | 'cr-stale'
  | 'timesheet-gap'
  | 'vacant-role';

export interface ExceptionRow {
  id: string;
  trigger: ExceptionTrigger;
  severity: ExceptionSeverity;
  subjectId: string | null;
  subjectLabel: string;
  diagnostic: string;
  action: ExceptionAction | null;
}

export interface ExceptionAction {
  label: string;
  kind: 'link' | 'mark-reviewed';
  href?: string;
  /** When kind === 'mark-reviewed' the frontend POSTs to this path. */
  postPath?: string;
}

export interface ExceptionsDto {
  projectId: string;
  asOf: string;
  rows: ExceptionRow[];
}
