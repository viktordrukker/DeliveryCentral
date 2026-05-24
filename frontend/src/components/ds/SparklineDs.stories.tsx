import type { Story } from '@ladle/react';

import { SparklineDs } from './SparklineDs';

export default { title: 'DS / Atoms / SparklineDs' };

export const Up: Story = () => <SparklineDs data={[3, 4, 5, 8, 7, 10, 12]} />;
export const Down: Story = () => <SparklineDs data={[12, 10, 11, 7, 6, 4, 3]} />;
export const Flat: Story = () => <SparklineDs data={[5, 5, 5, 5, 5]} />;
export const SingleValue: Story = () => <SparklineDs data={[42]} />;
export const Empty: Story = () => <SparklineDs data={[]} />;

export const AllTones: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {(['accent', 'active', 'warning', 'danger', 'info', 'muted'] as const).map((tone) => (
      <div key={tone} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 60, fontSize: 11, color: 'var(--color-text-muted)' }}>{tone}</span>
        <SparklineDs data={[2, 4, 3, 6, 5, 8, 7]} tone={tone} />
      </div>
    ))}
  </div>
);

export const NoFill: Story = () => <SparklineDs data={[2, 4, 3, 6, 5, 8, 7]} showAreaFill={false} />;
export const NoDot: Story = () => <SparklineDs data={[2, 4, 3, 6, 5, 8, 7]} showLastPoint={false} />;
export const Wide: Story = () => <SparklineDs data={[2, 4, 3, 6, 5, 8, 7, 9, 6, 11, 13]} width={200} height={40} />;
