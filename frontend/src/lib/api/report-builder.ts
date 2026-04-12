import { httpDelete, httpGet, httpPost } from './http-client';

export type ReportDataSource = 'people' | 'assignments' | 'projects' | 'timesheets' | 'work_evidence';

export interface ReportColumnDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'startsWith';
  value: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  ownerPersonId: string;
  dataSource: ReportDataSource;
  selectedColumns: string[];
  filters: ReportFilter[];
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  isShared: boolean;
  createdAt: string;
}

export interface BuilderSource {
  source: ReportDataSource;
  columns: ReportColumnDef[];
}

export async function fetchBuilderSources(): Promise<BuilderSource[]> {
  return httpGet<BuilderSource[]>('/reports/builder/sources');
}

export async function fetchReportTemplates(ownerPersonId?: string): Promise<ReportTemplate[]> {
  const qs = ownerPersonId ? `?ownerPersonId=${ownerPersonId}` : '';
  return httpGet<ReportTemplate[]>(`/reports/templates${qs}`);
}

export async function saveReportTemplate(
  template: Omit<ReportTemplate, 'id' | 'createdAt'>,
): Promise<ReportTemplate> {
  return httpPost<ReportTemplate, typeof template>('/reports/templates', template);
}

export async function deleteReportTemplate(id: string): Promise<{ success: boolean }> {
  return httpDelete<{ success: boolean }>(`/reports/templates/${id}`);
}
