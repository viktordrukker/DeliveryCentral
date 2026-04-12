export interface PersonDirectoryRecord {
  currentAssignmentCount: number;
  currentLineManager: { displayName: string; id: string } | null;
  currentOrgUnit: { code: string; id: string; name: string } | null;
  displayName: string;
  dottedLineManagers: Array<{ displayName: string; id: string }>;
  id: string;
  lifecycleStatus: string;
  primaryEmail: string | null;
  resourcePoolIds: string[];
  resourcePools: Array<{ id: string; name: string }>;
}

export interface ListPersonDirectoryResult {
  items: PersonDirectoryRecord[];
  total: number;
}

export interface PersonDirectoryQueryRepositoryPort {
  findById(id: string, asOf?: Date): Promise<PersonDirectoryRecord | null>;
  listManagerScope(query: {
    asOf: Date;
    managerId: string;
    page: number;
    pageSize: number;
  }): Promise<{
    directReports: PersonDirectoryRecord[];
    dottedLinePeople: PersonDirectoryRecord[];
    managerId: string;
    page: number;
    pageSize: number;
    totalDirectReports: number;
    totalDottedLinePeople: number;
  }>;
  list(query: {
    asOf: Date;
    departmentId?: string;
    page: number;
    pageSize: number;
    resourcePoolId?: string;
    role?: string;
  }): Promise<ListPersonDirectoryResult>;
}
