import { httpGet, httpPost } from './http-client';

export type ExceptionSeverity = 'amber' | 'red' | 'critical';
export type ExceptionTrigger =
  | 'radiator-axis'
  | 'risk-overdue-review'
  | 'risk-past-due'
  | 'milestone-slipped'
  | 'cr-stale'
  | 'timesheet-gap'
  | 'vacant-role';

export interface ExceptionAction {
  label: string;
  kind: 'link' | 'mark-reviewed';
  href?: string;
  postPath?: string;
}

export interface ExceptionRow {
  id: string;
  trigger: ExceptionTrigger;
  severity: ExceptionSeverity;
  subjectId: string | null;
  subjectLabel: string;
  diagnostic: string;
  action: ExceptionAction | null;
}

export interface ExceptionsDto {
  projectId: string;
  asOf: string;
  rows: ExceptionRow[];
}

export async function fetchProjectExceptions(projectId: string): Promise<ExceptionsDto> {
  return httpGet<ExceptionsDto>(`/projects/${projectId}/exceptions`);
}

export async function markRiskReviewed(projectId: string, riskId: string): Promise<void> {
  await httpPost<unknown, Record<string, never>>(
    `/projects/${projectId}/risks/${riskId}/mark-reviewed`,
    {},
  );
}
