import { httpPatch, httpPost } from './http-client';

export type ReportingLineType = 'SOLID';

export interface CreateReportingLineRequest {
  endDate?: string;
  managerId: string;
  personId: string;
  startDate: string;
  type: ReportingLineType;
}

export interface ReportingLineRecord {
  endDate?: string;
  id: string;
  managerId: string;
  personId: string;
  startDate: string;
  type: ReportingLineType;
}

export async function createReportingLine(
  request: CreateReportingLineRequest,
): Promise<ReportingLineRecord> {
  return httpPost<ReportingLineRecord, CreateReportingLineRequest>(
    '/org/reporting-lines',
    request,
  );
}

export async function terminateReportingLine(
  id: string,
  endDate: string,
): Promise<ReportingLineRecord> {
  return httpPatch<ReportingLineRecord, { endDate: string }>(`/org/reporting-lines/${id}`, {
    endDate,
  });
}
