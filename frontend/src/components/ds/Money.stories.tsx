import type { Story } from '@ladle/react';

import { Money } from './Money';

export default { title: 'DS / Atoms / Money' };

export const Default: Story = () => <Money value={1234} />;

export const Negative: Story = () => <Money value={-1234} />;

export const Compact: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <Money value={100} compact />
    <Money value={1500} compact />
    <Money value={12_400} compact />
    <Money value={1_200_000} compact />
    <Money value={5_700_000} compact />
  </div>
);

export const CurrencySymbols: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <Money value={1000} currency="USD" />
    <Money value={1000} currency="EUR" />
    <Money value={1000} currency="GBP" />
    <Money value={1000} currency="JPY" />
    <Money value={12_500_000} currency="UZS" />
  </div>
);

export const TabularAlignment: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'monospace' }}>
    <Money value={1234} />
    <Money value={123} />
    <Money value={-1234} />
    <Money value={12345678} />
  </div>
);

export const Fractional: Story = () => (
  <Money value={123.456} maxFractionDigits={2} />
);
