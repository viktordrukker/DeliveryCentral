import { httpPost } from './http-client';

export interface BulkImportPreviewRow {
  email: string;
  familyName: string;
  givenName: string;
  grade?: string;
  role?: string;
}

export interface BulkImportPreviewResponse {
  invalid: { errors: string[]; row: number }[];
  valid: BulkImportPreviewRow[];
}

export interface BulkImportConfirmResponse {
  created: number;
  failed: { email: string; reason: string }[];
  skipped: number;
}

export async function previewBulkImport(csvText: string): Promise<BulkImportPreviewResponse> {
  return httpPost<BulkImportPreviewResponse, { csvText: string }>('/admin/people/import/preview', { csvText });
}

export async function confirmBulkImport(rows: BulkImportPreviewRow[]): Promise<BulkImportConfirmResponse> {
  return httpPost<BulkImportConfirmResponse, { rows: BulkImportPreviewRow[] }>('/admin/people/import/confirm', { rows });
}
