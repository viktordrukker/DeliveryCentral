import type { Story } from '@ladle/react';

import { MiniBars } from './MiniBars';

export default { title: 'DS / Atoms / MiniBars' };

export const Basic: Story = () => <MiniBars data={[3, 5, 4, 7, 6, 9, 8]} />;
export const Empty: Story = () => <MiniBars data={[]} />;
export const AllZero: Story = () => <MiniBars data={[0, 0, 0, 0]} />;

export const WithThreshold: Story = () => (
  <MiniBars data={[3, 5, 4, 8, 6, 11, 9]} threshold={7} />
);

export const ToneAccent: Story = () => <MiniBars data={[3, 5, 4, 7, 6]} tone="accent" />;
export const ToneActive: Story = () => <MiniBars data={[3, 5, 4, 7, 6]} tone="active" />;
export const ToneDanger: Story = () => <MiniBars data={[3, 5, 4, 7, 6]} tone="danger" />;

export const WeeklyHours: Story = () => (
  <MiniBars data={[8, 8.5, 7.5, 9, 8.5, 0, 0]} threshold={8} />
);
