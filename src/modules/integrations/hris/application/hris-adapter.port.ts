export interface HrisEmployee {
  externalId: string;
  givenName: string;
  familyName: string;
  primaryEmail: string;
  jobTitle?: string;
  departmentName?: string;
  managerId?: string;
  status: 'ACTIVE' | 'TERMINATED' | 'LEAVE';
}

export interface HrisTerminationPayload {
  personId: string;
  effectiveDate: string;
  reason?: string;
}

export interface HrisAdapterPort {
  readonly adapterName: string;
  listEmployees(): Promise<HrisEmployee[]>;
  getEmployee(externalId: string): Promise<HrisEmployee | null>;
  pushTermination(payload: HrisTerminationPayload): Promise<void>;
}
