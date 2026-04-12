import { httpGet } from './http-client';

export interface OrgChartPersonSummary {
  displayName: string;
  id: string;
  lineManagerId: string | null;
  lineManagerName: string | null;
}

export interface OrgChartNode {
  children: OrgChartNode[];
  code: string;
  id: string;
  kind: string;
  manager: OrgChartPersonSummary | null;
  members: OrgChartPersonSummary[];
  name: string;
}

export interface DottedLineRelationship {
  managers: OrgChartPersonSummary[];
  person: OrgChartPersonSummary;
}

export interface OrgChartResponse {
  dottedLineRelationships: DottedLineRelationship[];
  roots: OrgChartNode[];
}

export async function fetchOrgChart(): Promise<OrgChartResponse> {
  return httpGet<OrgChartResponse>('/org/chart');
}
