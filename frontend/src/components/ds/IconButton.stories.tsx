import type { Story } from '@ladle/react';

import { IconButton, type IconButtonSize } from './IconButton';

export default { title: 'DS / IconButton' };

const SIZES: IconButtonSize[] = ['xs', 'sm', 'md', 'lg'];

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <path d="M7 2v10M2 7h10" />
  </svg>
);

export const AllSizes: Story = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    {SIZES.map((size) => (
      <IconButton key={size} size={size} aria-label={`Add (${size})`}>
        <PlusIcon />
      </IconButton>
    ))}
  </div>
);

export const Disabled: Story = () => (
  <IconButton aria-label="Add" disabled>
    <PlusIcon />
  </IconButton>
);
