import type { Story } from '@ladle/react';

import { Timeline, type TimelineSegment, type TimelineSize } from './Timeline';

export default { title: 'DS / Charts / Timeline' };

const today = new Date();
const iso = (offsetDays: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const sampleSegments: TimelineSegment[] = [
  { allocationPercent: 60, endDate: iso(45), href: '/assignments?id=1', id: '1', label: 'Acme Mobile Migration', startDate: iso(-30), status: 'APPROVED' },
  { allocationPercent: 30, endDate: iso(20), href: '/assignments?id=2', id: '2', label: 'Initech Platform R&D', startDate: iso(-15), status: 'IN_REVIEW' },
  { allocationPercent: 40, endDate: iso(120), href: '/assignments?id=3', id: '3', label: 'Globex AI Discovery', startDate: iso(15), status: 'PROPOSED' },
  { allocationPercent: 25, endDate: iso(180), href: '/assignments?id=4', id: '4', label: 'Stark Industries Audit', startDate: iso(60), status: 'BOOKED' },
  { allocationPercent: 50, endDate: iso(60), href: '/assignments?id=5', id: '5', label: 'Wayne Risk Review', startDate: iso(40), status: 'ON_HOLD' },
];

const overlappingSegments: TimelineSegment[] = [
  { allocationPercent: 80, endDate: iso(30), id: 'a', label: 'Project Alpha', startDate: iso(-10), status: 'APPROVED' },
  { allocationPercent: 50, endDate: iso(40), id: 'b', label: 'Project Beta', startDate: iso(5), status: 'APPROVED' },
];

const sizes: TimelineSize[] = ['xs', 'sm', 'md', 'lg'];

export const AllSizesStacked: Story = () => (
  <div style={{ display: 'grid', gap: 24, maxWidth: 720 }}>
    {sizes.map((size) => (
      <div key={size}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>size = {size}</div>
        <Timeline segments={sampleSegments} size={size} variant="stacked" />
      </div>
    ))}
  </div>
);

export const AllSizesBar: Story = () => (
  <div style={{ display: 'grid', gap: 24, maxWidth: 720 }}>
    {sizes.map((size) => (
      <div key={size}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>size = {size}</div>
        <Timeline segments={sampleSegments.slice(0, 1)} size={size} variant="bar" />
      </div>
    ))}
  </div>
);

export const StackedFull: Story = () => (
  <div style={{ maxWidth: 720 }}>
    <Timeline segments={sampleSegments} size="lg" showLegend variant="stacked" />
  </div>
);

export const StackedCompact: Story = () => (
  <div style={{ maxWidth: 480 }}>
    <Timeline segments={sampleSegments} size="md" variant="stacked" />
  </div>
);

export const Overallocated: Story = () => (
  <div style={{ maxWidth: 720 }}>
    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
      Two overlapping segments stack above 100%. The danger-tinted background marks the conflict
      window; the dashed line marks the 100% threshold.
    </p>
    <Timeline segments={overlappingSegments} size="lg" showLegend variant="stacked" />
  </div>
);

export const AllStatusTones: Story = () => {
  const tones = ['APPROVED', 'IN_REVIEW', 'PROPOSED', 'BOOKED', 'ON_HOLD', 'CANCELLED', 'COMPLETED', 'DRAFT'];
  const segs: TimelineSegment[] = tones.map((status, i) => ({
    allocationPercent: 25,
    endDate: iso(-90 + (i + 1) * 25),
    id: `t-${i}`,
    label: status,
    startDate: iso(-90 + i * 25),
    status,
  }));
  return (
    <div style={{ maxWidth: 720 }}>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
        Each segment uses the same color scale as <code>StatusBadge</code>.
      </p>
      <Timeline segments={segs} size="lg" showLegend variant="stacked" />
    </div>
  );
};

export const Empty: Story = () => (
  <div style={{ maxWidth: 480 }}>
    <Timeline segments={[]} size="md" variant="stacked" />
  </div>
);

export const WithMarkers: Story = () => (
  <div style={{ maxWidth: 720 }}>
    <Timeline
      markers={[
        { date: iso(90), label: 'milestone', tone: 'warning' },
        { date: iso(-60), label: 'kickoff', tone: 'info' },
      ]}
      segments={sampleSegments}
      size="lg"
      showLegend
      variant="stacked"
    />
  </div>
);

export const InsideClippedContainer: Story = () => (
  <div>
    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
      The hover card escapes <code>overflow: hidden</code> via portal — hover any bar to verify.
    </p>
    <div style={{ overflow: 'hidden', border: '1px dashed var(--color-status-warning)', padding: 8, width: 320 }}>
      <Timeline segments={sampleSegments} size="md" variant="stacked" />
    </div>
  </div>
);

export const NarrowViewport: Story = () => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 320 }}>
    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', position: 'absolute', top: 24 }}>
      Bars are pushed to the right edge; hover should flip the popup to the left side.
    </p>
    <div style={{ width: 240 }}>
      <Timeline segments={sampleSegments} size="md" variant="stacked" />
    </div>
  </div>
);
