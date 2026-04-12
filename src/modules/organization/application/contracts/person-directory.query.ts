export interface ListPeopleQuery {
  departmentId?: string;
  page: number;
  pageSize: number;
  resourcePoolId?: string;
  role?: string;
}
