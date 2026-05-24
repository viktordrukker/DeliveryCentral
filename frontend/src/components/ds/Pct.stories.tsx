import type { Story } from '@ladle/react';

import { Pct } from './Pct';

export default { title: 'DS / Atoms / Pct' };

export const Default: Story = () => <Pct value={12.5} />;

export const Negative: Story = () => <Pct value={-3.4} />;

export const WithSignPrefix: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <Pct value={8.2} sign />
    <Pct value={0} sign />
    <Pct value={-3.4} sign />
  </div>
);

export const ToneAuto: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <Pct value={5} sign tone="auto" />
    <Pct value={0} sign tone="auto" />
    <Pct value={-5} sign tone="auto" />
  </div>
);

export const ExplicitTones: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <Pct value={12.5} tone="active" />
    <Pct value={12.5} tone="warning" />
    <Pct value={12.5} tone="danger" />
    <Pct value={12.5} tone="info" />
    <Pct value={12.5} tone="muted" />
  </div>
);

export const WholePercent: Story = () => (
  <Pct value={87} fractionDigits={0} />
);
