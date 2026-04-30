import { useState } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { fetchAssignments } from '@/lib/api/assignments';
import { fetchCapitalisationReport } from '@/lib/api/capitalisation';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchApprovalQueue } from '@/lib/api/timesheets';
import { fetchWorkloadMatrix } from '@/lib/api/workload';
import { exportToXlsx } from '@/lib/export';
import { Button, DatePicker } from '@/components/ds';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

interface ReportCardProps {
  description: string;
  hasDateRange?: boolean;
  name: string;
  onGenerate: (from: string, to: string) => Promise<void>;
}

function ReportCard({ description, hasDateRange, name, onGenerate }: ReportCardProps): JSX.Element {
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = (): void => {
    setLoading(true);
    setError(null);

    void onGenerate(from, to)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Export failed.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        marginBottom: '16px',
        padding: '20px 24px',
      }}
    >
      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px' }}>{name}</h3>
      <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 16px' }}>{description}</p>

      {hasDateRange ? (
        <div style={{ alignItems: 'flex-end', display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <label className="field" style={{ flex: '0 0 auto' }}>
            <span className="field__label">From</span>
            <DatePicker onValueChange={(value) => setFrom(value)} value={from}
 />
          </label>
          <label className="field" style={{ flex: '0 0 auto' }}>
            <span className="field__label">To</span>
            <DatePicker onValueChange={(value) => setTo(value)} value={to}
 />
          </label>
        </div>
      ) : null}

      {error ? <ErrorState description={error} /> : null}

      <Button variant="primary" disabled={loading} onClick={handleGenerate} type="button">
        {loading ? 'Generating…' : 'Generate & Download'}
      </Button>
    </div>
  );
}

export function ExportCentrePage(): JSX.Element {
  async function generateHeadcount(): Promise<void> {
    const res = await fetchPersonDirectory({ pageSize: 500 });
    const rows = res.items.map((p) => ({
      'Active Assignments': p.currentAssignmentCount,
      Email: p.primaryEmail ?? '',
      Manager: p.currentLineManager?.displayName ?? '',
      Name: p.displayName,
      'Org Unit': p.currentOrgUnit?.name ?? '',
      'Resource Pools': p.resourcePools.map((r) => r.name).join(', '),
      Status: p.lifecycleStatus,
    }));
    exportToXlsx(rows, `headcount_${today()}`);
  }

  async function generateAssignmentOverview(): Promise<void> {
    const res = await fetchAssignments({ pageSize: 500 });
    const rows = res.items.map((a) => ({
      'Allocation %': a.allocationPercent,
      'End Date': a.endDate ?? '',
      Person: a.person.displayName,
      Project: a.project.displayName,
      Role: a.staffingRole,
      'Start Date': a.startDate,
      Status: a.approvalState,
    }));
    exportToXlsx(rows, `assignments_${today()}`);
  }

  async function generateTimesheetSummary(from: string, to: string): Promise<void> {
    const weeks = await fetchApprovalQueue({ from, status: 'APPROVED', to });
    const rows = weeks.flatMap((week) => {
      const totalHours = week.entries.reduce((s, e) => s + e.hours, 0);
      const capexHours = week.entries.filter((e) => e.capex).reduce((s, e) => s + e.hours, 0);
      const opexHours = totalHours - capexHours;
      return [
        {
          'CAPEX Hours': capexHours,
          'OPEX Hours': opexHours,
          Person: week.personId,
          Status: week.status,
          'Total Hours': totalHours,
          Week: week.weekStart,
        },
      ];
    });
    exportToXlsx(rows, `timesheets_${today()}`);
  }

  async function generateCapexOpex(from: string, to: string): Promise<void> {
    const report = await fetchCapitalisationReport({ from, to });
    const rows = report.byProject.map((row) => ({
      Alert: row.alert ? 'Yes' : 'No',
      'CAPEX %': row.capexPercent,
      'CAPEX Hours': row.capexHours,
      'OPEX Hours': row.opexHours,
      Project: row.projectName,
      'Total Hours': row.totalHours,
    }));
    exportToXlsx(rows, `capitalisation_${today()}`);
  }

  async function generateWorkloadMatrix(): Promise<void> {
    const matrix = await fetchWorkloadMatrix();
    const projectNames = matrix.projects.map((p) => p.name);

    const rows: Record<string, string | number>[] = matrix.people.map((person) => {
      const row: Record<string, string | number> = { Person: person.displayName };
      let total = 0;

      for (const proj of projectNames) {
        const allocation = person.allocations.find((a) => a.projectName === proj);
        const pct = allocation?.allocationPercent ?? 0;
        row[proj] = pct;
        total += pct;
      }

      row['Total %'] = total;
      return row;
    });

    exportToXlsx(rows, `workload_matrix_${today()}`);
  }

  return (
    <PageContainer testId="export-centre-page">
      <PageHeader
        eyebrow="Reports"
        subtitle="Generate and download data exports for headcount, assignments, timesheets, capitalisation, and workload."
        title="Export Centre"
      />

      <div style={{ maxWidth: '720px' }}>
        <ReportCard
          description="Downloads the full current people directory with status, org unit, manager, resource pools, and assignment count."
          name="Headcount Report"
          onGenerate={generateHeadcount}
        />

        <ReportCard
          description="Downloads all current assignments with person, project, role, allocation %, status, and dates."
          name="Assignment Overview"
          onGenerate={generateAssignmentOverview}
        />

        <ReportCard
          description="Downloads approved timesheet weeks with total, CAPEX, and OPEX hours for the selected date range."
          hasDateRange
          name="Timesheet Summary"
          onGenerate={generateTimesheetSummary}
        />

        <ReportCard
          description="Downloads CAPEX/OPEX hours by project from approved timesheets for the selected date range."
          hasDateRange
          name="CAPEX/OPEX by Project"
          onGenerate={generateCapexOpex}
        />

        <ReportCard
          description="Downloads the current workload matrix as a person × project allocation table."
          name="Workload Matrix"
          onGenerate={generateWorkloadMatrix}
        />
      </div>
    </PageContainer>
  );
}
