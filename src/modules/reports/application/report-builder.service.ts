import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

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

const DATA_SOURCE_COLUMNS: Record<ReportDataSource, ReportColumnDef[]> = {
  people: [
    { key: 'id', label: 'Person ID', type: 'string' },
    { key: 'displayName', label: 'Full Name', type: 'string' },
    { key: 'primaryEmail', label: 'Email', type: 'string' },
    { key: 'grade', label: 'Grade', type: 'string' },
    { key: 'role', label: 'Role', type: 'string' },
  ],
  assignments: [
    { key: 'id', label: 'Assignment ID', type: 'string' },
    { key: 'personId', label: 'Person ID', type: 'string' },
    { key: 'projectId', label: 'Project ID', type: 'string' },
    { key: 'allocationPercent', label: 'Allocation %', type: 'number' },
    { key: 'validFrom', label: 'Start Date', type: 'date' },
    { key: 'validTo', label: 'End Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'string' },
  ],
  projects: [
    { key: 'id', label: 'Project ID', type: 'string' },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'projectCode', label: 'Code', type: 'string' },
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'endDate', label: 'End Date', type: 'date' },
  ],
  timesheets: [
    { key: 'id', label: 'Timesheet ID', type: 'string' },
    { key: 'personId', label: 'Person ID', type: 'string' },
    { key: 'weekStart', label: 'Week Start', type: 'date' },
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'totalHours', label: 'Total Hours', type: 'number' },
  ],
  work_evidence: [
    { key: 'id', label: 'Evidence ID', type: 'string' },
    { key: 'personId', label: 'Person ID', type: 'string' },
    { key: 'projectId', label: 'Project ID', type: 'string' },
    { key: 'category', label: 'Category', type: 'string' },
    { key: 'evidenceDate', label: 'Date', type: 'date' },
    { key: 'isCapex', label: 'CAPEX', type: 'boolean' },
  ],
};

@Injectable()
export class ReportBuilderService {
  private readonly templates = new Map<string, ReportTemplate>();

  public getAvailableSources(): { source: ReportDataSource; columns: ReportColumnDef[] }[] {
    return (Object.entries(DATA_SOURCE_COLUMNS) as [ReportDataSource, ReportColumnDef[]][]).map(
      ([source, columns]) => ({ source, columns }),
    );
  }

  public createTemplate(
    name: string,
    ownerPersonId: string,
    dataSource: ReportDataSource,
    selectedColumns: string[],
    filters: ReportFilter[],
    sortBy?: string,
    sortDir?: 'asc' | 'desc',
    isShared = false,
  ): ReportTemplate {
    const template: ReportTemplate = {
      id: randomUUID(),
      name,
      ownerPersonId,
      dataSource,
      selectedColumns,
      filters,
      sortBy,
      sortDir,
      isShared,
      createdAt: new Date().toISOString(),
    };
    this.templates.set(template.id, template);
    return template;
  }

  public listTemplates(ownerPersonId?: string): ReportTemplate[] {
    return Array.from(this.templates.values()).filter(
      (t) => !ownerPersonId || t.isShared || t.ownerPersonId === ownerPersonId,
    );
  }

  public getTemplate(id: string): ReportTemplate | undefined {
    return this.templates.get(id);
  }

  public deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }
}
