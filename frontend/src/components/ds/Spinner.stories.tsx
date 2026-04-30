import type { Story } from '@ladle/react';

import { Spinner, type SpinnerSize } from './Spinner';

export default { title: 'DS / Spinner' };

const SIZES: SpinnerSize[] = ['xs', 'sm', 'md', 'lg'];

export const AllSizes: Story = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    {SIZES.map((size) => <Spinner key={size} size={size} />)}
  </div>
);

export const InlineWithText: Story = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <Spinner size="sm" /> Loading projects…
  </span>
);
