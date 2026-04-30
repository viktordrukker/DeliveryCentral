import type { Story } from '@ladle/react';

import { Skeleton } from './Skeleton';

export default { title: 'DS / Skeleton' };

export const Text: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 240 }}>
    <Skeleton shape="text" width="60%" />
    <Skeleton shape="text" width="80%" />
    <Skeleton shape="text" width="40%" />
  </div>
);

export const Rectangle: Story = () => (
  <Skeleton width={240} height={120} />
);

export const Circle: Story = () => (
  <Skeleton shape="circle" width={48} height={48} />
);

export const Card: Story = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
    <Skeleton shape="circle" width={40} height={40} />
    <div style={{ flex: 1 }}>
      <Skeleton shape="text" width="50%" />
      <div style={{ height: 4 }} />
      <Skeleton shape="text" width="80%" />
    </div>
  </div>
);
