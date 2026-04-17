import { useState } from 'react';

import { fetchStaffingDesk, type StaffingDeskQuery, type StaffingDeskRow } from '@/lib/api/staffing-desk';
import { exportToXlsx } from '@/lib/export';

interface Props {
  disabled?: boolean;
  query: StaffingDeskQuery;
}

function mapRow(row: StaffingDeskRow): Record<string, unknown> {
  return {
    Type: row.kind === 'assignment' ? 'Assignment' : 'Request',
    Person: row.personName ?? '',
    Project: row.projectName,
    Role: row.role,
    'Allocation %': row.allocationPercent,
    Status: row.status,
    Priority: row.priority ?? '',
    'Start Date': row.startDate,
    'End Date': row.endDate ?? '',
    Skills: row.skills.join(', '),
    'HC Required': row.headcountRequired ?? '',
    'HC Fulfilled': row.headcountFulfilled ?? '',
  };
}

export function StaffingDeskExportButton({ disabled, query }: Props): JSX.Element {
  const [loading, setLoading] = useState(false);

  function handleExport(): void {
    setLoading(true);
    void fetchStaffingDesk({ ...query, page: '1', pageSize: '5000' })
      .then((response) => {
        const rows = response.items.map(mapRow);
        const date = new Date().toISOString().slice(0, 10);
        exportToXlsx(rows, `staffing_desk_${date}`);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  return (
    <button
      className="button button--secondary button--sm"
      disabled={disabled || loading}
      onClick={handleExport}
      type="button"
    >
      {loading ? 'Exporting...' : 'Export XLSX'}
    </button>
  );
}
