import type { Story } from '@ladle/react';

import { GanttRow } from './GanttRow';

export default { title: 'DS / Atoms / GanttRow' };

export const Single: Story = () => <GanttRow label="Discovery" start={0} end={20} />;

export const WithMarker: Story = () => (
  <GanttRow label="Build" start={20} end={70} marker={45} />
);

export const Dim: Story = () => (
  <GanttRow label="Archived phase" start={0} end={30} dim />
);

export const Tones: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    {(['accent', 'active', 'warning', 'danger', 'info', 'muted'] as const).map((tone, i) => (
      <GanttRow key={tone} label={tone} start={i * 10} end={i * 10 + 25} tone={tone} />
    ))}
  </div>
);

export const ProjectPlan: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <GanttRow label="Discovery" start={0} end={15} tone="active" />
    <GanttRow label="Design" start={10} end={35} tone="accent" />
    <GanttRow label="Build" start={30} end={75} tone="accent" marker={62} />
    <GanttRow label="QA" start={60} end={88} tone="warning" />
    <GanttRow label="Launch" start={85} end={92} tone="active" />
    <GanttRow label="Hyper-care" start={92} end={100} tone="muted" dim />
  </div>
);
