import { Table, type Column } from '@/components/ds';

interface DataQualityRadarProps {
  scores: {
    assignmentPct: number;
    emailPct: number;
    managerPct: number;
    orgUnitPct: number;
    resourcePoolPct: number;
  };
}

interface SignalRow {
  label: string;
  value: number;
}

export function DataQualityRadar({ scores }: DataQualityRadarProps): JSX.Element {
  const rows: SignalRow[] = [
    { label: 'Manager', value: scores.managerPct },
    { label: 'Org Unit', value: scores.orgUnitPct },
    { label: 'Assignments', value: scores.assignmentPct },
    { label: 'Email', value: scores.emailPct },
    { label: 'Resource Pool', value: scores.resourcePoolPct },
  ];

  const columns: Column<SignalRow>[] = [
    { key: 'label', title: 'Signal', getValue: (r) => r.label, render: (r) => r.label },
    { key: 'value', title: 'Coverage', align: 'right', getValue: (r) => r.value, render: (r) => `${r.value}%` },
  ];

  return (
    <Table
      variant="compact"
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.label}
    />
  );
}
