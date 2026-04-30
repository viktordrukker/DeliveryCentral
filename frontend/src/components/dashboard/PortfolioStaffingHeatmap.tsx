import { Link } from 'react-router-dom';

import { StatusBadge } from '@/components/common/StatusBadge';
import { Table, type Column } from '@/components/ds';
import type { PortfolioHeatmapResponse, PortfolioHeatmapRow } from '@/lib/api/portfolio-dashboard';

interface PortfolioStaffingHeatmapProps {
  data: PortfolioHeatmapResponse;
}

const RAG_BG: Record<string, string> = {
  GREEN: 'var(--color-status-active)',
  AMBER: 'var(--color-status-warning)',
  RED: 'var(--color-status-danger)',
};

/** Compute the pixel range a date falls in within the week columns */
function dateToColumnIndex(dateStr: string | null, weekHeaders: string[]): number | null {
  if (!dateStr || weekHeaders.length === 0) return null;
  const d = new Date(dateStr).getTime();
  const first = new Date(weekHeaders[0]).getTime();
  const last = new Date(weekHeaders[weekHeaders.length - 1]).getTime() + 7 * 86400000;
  if (d < first) return -1;
  if (d > last) return weekHeaders.length;
  for (let i = 0; i < weekHeaders.length; i++) {
    const wStart = new Date(weekHeaders[i]).getTime();
    const wEnd = wStart + 7 * 86400000;
    if (d >= wStart && d < wEnd) return i;
  }
  return null;
}

function ProjectTimelineBar({ row, weekHeaders }: { row: PortfolioHeatmapRow; weekHeaders: string[] }): JSX.Element {
  const totalCols = weekHeaders.length;
  const startIdx = dateToColumnIndex(row.startsOn, weekHeaders);
  const endIdx = dateToColumnIndex(row.endsOn, weekHeaders);

  // Staffing bar: spans from first week with staff to last
  const staffStart = row.weekColumns.findIndex((c) => c.staffedCount > 0);
  const staffEnd = row.weekColumns.length - 1 - [...row.weekColumns].reverse().findIndex((c) => c.staffedCount > 0);

  return (
    <div style={{ position: 'relative', height: 20, background: 'var(--color-surface-alt)', borderRadius: 2, overflow: 'hidden' }}>
      {/* Staffing fill bar */}
      {staffStart >= 0 && staffEnd >= staffStart && (
        <div
          style={{
            position: 'absolute',
            left: `${(staffStart / totalCols) * 100}%`,
            width: `${((staffEnd - staffStart + 1) / totalCols) * 100}%`,
            top: 4,
            height: 12,
            borderRadius: 2,
            background: RAG_BG[row.currentRag],
            opacity: 0.6,
          }}
          title={`Staffed: ${row.staffCount}/${row.plannedCount}`}
        />
      )}

      {/* Project start marker */}
      {startIdx !== null && startIdx >= 0 && startIdx < totalCols && (
        <div
          style={{
            position: 'absolute',
            left: `${(startIdx / totalCols) * 100}%`,
            top: 0,
            width: 2,
            height: '100%',
            background: 'var(--color-accent)',
          }}
          title={`Start: ${row.startsOn}`}
        />
      )}

      {/* Project end marker */}
      {endIdx !== null && endIdx >= 0 && endIdx < totalCols && (
        <div
          style={{
            position: 'absolute',
            left: `${((endIdx + 1) / totalCols) * 100}%`,
            top: 0,
            width: 2,
            height: '100%',
            background: 'var(--color-status-danger)',
            borderLeft: '1px dashed var(--color-status-danger)',
          }}
          title={`End: ${row.endsOn}`}
        />
      )}

      {/* Week cell RAG dots overlaid */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
        {row.weekColumns.map((col) => (
          <div
            key={col.weekStart}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={`${col.weekStart}: ${col.projectedFillRate}% (${col.staffedCount} staff)`}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: RAG_BG[col.rag], opacity: 0.9 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortfolioStaffingHeatmap({ data }: PortfolioStaffingHeatmapProps): JSX.Element {
  if (data.rows.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No active projects with staffing data.</p>;
  }

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-3)', fontSize: 12, flexWrap: 'wrap' }}>
        <span>{data.summary.totalProjects} projects</span>
        <span>HC: <strong>{data.summary.totalFilledHC}</strong>/{data.summary.totalPlannedHC}</span>
        <span>Fill: <strong>{data.summary.overallFillRate}%</strong></span>
        <span style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-status-active)' }} /> {data.summary.greenCount}
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-status-warning)', marginLeft: 6 }} /> {data.summary.amberCount}
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-status-danger)', marginLeft: 6 }} /> {data.summary.redCount}
        </span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 2, height: 10, background: 'var(--color-accent)' }} /> Project start</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 2, height: 10, background: 'var(--color-status-danger)', borderLeft: '1px dashed var(--color-status-danger)' }} /> Project end</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 20, height: 8, borderRadius: 2, background: 'var(--color-status-active)', opacity: 0.6 }} /> Staffing coverage</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-status-warning)' }} /> Weekly RAG</span>
      </div>

      {/* Heatmap table */}
      <Table
        variant="compact"
        columns={[
          {
            key: 'project',
            title: 'Project',
            getValue: (r) => r.projectName,
            headerClassName: 'ds-heatmap-sticky-header',
            cellStyle: { position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1, minWidth: 160 },
            render: (r) => (
              <>
                <Link to={`/projects/${r.projectId}/dashboard`} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 500 }}>
                  {r.projectName}
                </Link>
                {r.clientName ? <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{r.clientName}</div> : null}
              </>
            ),
          },
          {
            key: 'rag',
            title: 'RAG',
            align: 'center',
            width: 45,
            getValue: (r) => r.currentRag,
            render: (r) => <StatusBadge status={r.currentRag === 'GREEN' ? 'active' : r.currentRag === 'AMBER' ? 'warning' : 'danger'} label={r.currentRag[0]} variant="chip" />,
          },
          {
            key: 'staff',
            title: 'Staff',
            align: 'right',
            width: 60,
            getValue: (r) => r.staffCount,
            render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{r.staffCount}/{r.plannedCount}</span>,
          },
          {
            key: 'fill',
            title: 'Fill',
            align: 'right',
            width: 50,
            getValue: (r) => r.currentFillRate,
            render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: RAG_BG[r.currentRag] }}>{r.currentFillRate}%</span>,
          },
          {
            key: 'timeline',
            title: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--color-text-muted)' }}>
                  {data.weekHeaders.map((w) => <span key={w}>{w.slice(5)}</span>)}
                </div>
                Timeline
              </>
            ),
            cellStyle: { padding: '4px 8px', minWidth: 300 },
            render: (r) => <ProjectTimelineBar row={r} weekHeaders={data.weekHeaders} />,
          },
        ] as Column<PortfolioHeatmapRow>[]}
        rows={data.rows}
        getRowKey={(r) => r.projectId}
      />
    </div>
  );
}
