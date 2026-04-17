import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import type { ProjectVendorEngagementDto } from '@/lib/api/vendors';

interface VendorEngagementPanelProps {
  engagements: ProjectVendorEngagementDto[];
}

function formatCurrency(value: number | null): string {
  if (value == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function dateRange(start: string | null, end: string | null): string {
  const s = formatDate(start);
  const e = end ? formatDate(end) : 'ongoing';
  if (!s && !end) return 'No dates specified';
  return `${s || '?'} \u2192 ${e}`;
}

export function VendorEngagementPanel({ engagements }: VendorEngagementPanelProps): JSX.Element {
  if (engagements.length === 0) {
    return <EmptyState title="No vendor engagements" description="No vendors are currently assigned to this project." />;
  }

  return (
    <div
      data-testid="vendor-engagement-panel"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 'var(--space-3)',
      }}
    >
      {engagements.map((eng) => (
        <div
          key={eng.id}
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: 'var(--space-3)',
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
              {eng.vendorName}
            </div>
            <StatusBadge status={eng.status} variant="chip" />
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
            {eng.roleSummary}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', fontSize: 12, marginBottom: 'var(--space-2)' }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 4,
              background: 'var(--color-status-info)',
              color: 'var(--color-surface)',
              fontWeight: 600,
              fontSize: 11,
            }}>
              {eng.headcount} HC
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Monthly rate</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(eng.monthlyRate)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Blended day rate</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(eng.blendedDayRate)}
              </span>
            </div>
          </div>

          <div style={{
            marginTop: 'var(--space-2)',
            paddingTop: 'var(--space-2)',
            borderTop: '1px solid var(--color-border)',
            fontSize: 11,
            color: 'var(--color-text-subtle)',
          }}>
            {dateRange(eng.startDate, eng.endDate)}
          </div>
        </div>
      ))}
    </div>
  );
}
