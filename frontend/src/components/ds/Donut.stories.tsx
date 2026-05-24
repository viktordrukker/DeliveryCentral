import type { Story } from '@ladle/react';

import { Donut } from './Donut';

export default { title: 'DS / Atoms / Donut' };

export const Quarter: Story = () => <Donut value={25} />;
export const Half: Story = () => <Donut value={50} />;
export const ThreeQuarter: Story = () => <Donut value={75} />;
export const Full: Story = () => <Donut value={100} />;
export const WithLabel: Story = () => <Donut value={68} label="68%" size={72} />;

export const AllTones: Story = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    {(['accent', 'active', 'warning', 'danger', 'info', 'muted'] as const).map((tone) => (
      <div key={tone} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <Donut value={60} tone={tone} />
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{tone}</span>
      </div>
    ))}
  </div>
);

export const Sizes: Story = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <Donut value={50} size={32} thickness={4} />
    <Donut value={50} size={56} thickness={6} />
    <Donut value={50} size={88} thickness={8} label="50%" />
    <Donut value={50} size={120} thickness={10} label="50%" />
  </div>
);
