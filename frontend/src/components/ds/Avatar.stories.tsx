import type { Story } from '@ladle/react';

import { Avatar } from './Avatar';

export default { title: 'DS / Atoms / Avatar' };

export const SingleSize: Story = () => <Avatar name="Priya Natarajan" />;

export const AllSizes: Story = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Avatar name="Priya Natarajan" size="xs" />
    <Avatar name="Priya Natarajan" size="sm" />
    <Avatar name="Priya Natarajan" size="md" />
    <Avatar name="Priya Natarajan" size="lg" />
    <Avatar name="Priya Natarajan" size="xl" />
  </div>
);

export const EightHues: Story = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    {['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi'].map((n) => (
      <Avatar key={n} name={n} size="lg" />
    ))}
  </div>
);

export const Stack: Story = () => (
  <div style={{ display: 'inline-flex' }}>
    {['Alice', 'Bob', 'Carol', 'Dave', 'Eve'].map((n, i) => (
      <Avatar
        key={n}
        name={n}
        size="md"
        style={{ marginLeft: i === 0 ? 0 : -8, border: '2px solid var(--color-surface)' }}
      />
    ))}
  </div>
);

export const WithImage: Story = () => (
  <Avatar name="Priya Natarajan" src="https://i.pravatar.cc/80?img=1" size="lg" />
);

export const SingleToken: Story = () => <Avatar name="Cher" size="lg" />;
