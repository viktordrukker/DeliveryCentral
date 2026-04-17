export class StaffingDeskQueryDto {
  kind?: string;            // 'assignment' | 'request' | 'all'
  person?: string;          // text search on person name
  personId?: string;
  project?: string;         // text search on project name
  projectId?: string;
  poolId?: string;
  orgUnitId?: string;
  status?: string;          // comma-separated statuses
  priority?: string;        // comma-separated priorities
  role?: string;            // text search on staffing role
  skills?: string;          // comma-separated skill names
  from?: string;            // date (YYYY-MM-DD)
  to?: string;              // date (YYYY-MM-DD)
  allocMin?: string;        // number
  allocMax?: string;        // number
  sortBy?: string;          // field name
  sortDir?: string;         // 'asc' | 'desc'
  page?: string;            // number
  pageSize?: string;        // number
}
