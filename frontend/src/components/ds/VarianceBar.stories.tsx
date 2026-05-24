import type { Story } from '@ladle/react';

import { VarianceBar } from './VarianceBar';

export default { title: 'DS / Atoms / VarianceBar' };

export const Positive: Story = () => <VarianceBar value={6} max={10} />;
export const Negative: Story = () => <VarianceBar value={-6} max={10} />;
export const Zero: Story = () => <VarianceBar value={0} max={10} />;
export const Clamped: Story = () => <VarianceBar value={25} max={10} />;
export const Neutral: Story = () => <VarianceBar value={4} max={10} tone="neutral" />;
export const Wider: Story = () => <VarianceBar value={-3} max={10} width={240} height={12} />;

export const BudgetLadder: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
    {[-8, -3, -1, 0, 1, 3, 8].map((v) => (
      <div key={v} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', alignItems: 'center', gap: 8 }}>
        <span style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{v > 0 ? `+${v}` : v}</span>
        <VarianceBar value={v} max={10} />
      </div>
    ))}
  </div>
);
