import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { ChartWrapper } from '@/components/common/ChartWrapper';
import { ContextMenu } from '@/components/common/ContextMenu';
import { useContextMenu } from '@/lib/hooks/useContextMenu';
import { ChartPatternDefs } from './ChartPatterns';
import { SrOnlyTable } from './SrOnlyTable';

interface ProjectStaffingCoverageChartProps {
  data: Array<{ allocated: number; name: string; projectId?: string; required: number }>;
  csvData?: { headers: string[]; rows: Array<Array<string | number>> };
}

export function ProjectStaffingCoverageChart({ data, csvData }: ProjectStaffingCoverageChartProps): JSX.Element {
  const navigate = useNavigate();
  const { onContextMenu, isOpen, position, items: ctxItems, close } = useContextMenu();

  function handleClick(entry: unknown): void {
    const e = entry as { activePayload?: Array<{ payload: { name: string; projectId?: string } }> } | null;
    const payload = e?.activePayload?.[0]?.payload;
    if (payload?.projectId) {
      void navigate(`/assignments?projectId=${payload.projectId}`);
    } else if (payload?.name) {
      void navigate(`/assignments?projectName=${encodeURIComponent(payload.name)}`);
    }
  }

  function handleBarRightClick(event: React.MouseEvent, entry: unknown): void {
    const payload = (entry as { name?: string; projectId?: string } | null);
    const menuItems = [
      {
        label: 'View details',
        onClick: () => {
          if (payload?.projectId) {
            void navigate(`/assignments?projectId=${payload.projectId}`);
          }
        },
      },
      {
        label: 'Copy data',
        onClick: () => {
          const text = data.map((d) => `${d.name}: Required=${d.required}, Allocated=${d.allocated}`).join('\n');
          void navigator.clipboard.writeText(text);
        },
      },
    ];
    if (csvData) {
      menuItems.push({
        label: 'Export CSV',
        onClick: () => {
          const rows = [csvData.headers.join(','), ...csvData.rows.map((r) => r.join(','))];
          const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'staffing-coverage.csv';
          a.click();
          URL.revokeObjectURL(url);
        },
      });
    }
    onContextMenu(event, menuItems);
  }

  return (
    <ChartWrapper ariaLabel="Staffing Coverage — bar chart showing required vs allocated FTE per project">
      <SrOnlyTable
        caption="Staffing Coverage: Required vs Allocated FTE per project"
        headers={['Project', 'Required FTE', 'Allocated FTE']}
        rows={data.map((d) => [d.name, d.required, d.allocated])}
      />
      <div onContextMenu={(e) => handleBarRightClick(e, null)} style={{ minHeight: 300, width: '100%' }}>
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} layout="vertical" onClick={handleClick} style={{ cursor: 'pointer' }}>
            <ChartPatternDefs />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip />
            <Legend />
            <Bar dataKey="required" fill="url(#pattern-stripe)" name="Required FTE" stroke="#64748b" strokeWidth={1} />
            <Bar dataKey="allocated" fill="url(#pattern-stripe-indigo)" name="Allocated FTE" stroke="#6366f1" strokeWidth={1} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {isOpen ? <ContextMenu items={ctxItems} onClose={close} position={position} /> : null}
    </ChartWrapper>
  );
}
