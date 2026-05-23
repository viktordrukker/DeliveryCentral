import type { Story } from '@ladle/react';

import { BalanceMeter } from './BalanceMeter';

export default { title: 'DS / Data / BalanceMeter' };

export const UnderBudget: Story = () => (
  <BalanceMeter entitlement={25} used={8} pending={2} />
);

export const NearLimit: Story = () => (
  <BalanceMeter entitlement={25} used={22} pending={2} />
);

export const Overdrawn: Story = () => (
  <BalanceMeter entitlement={25} used={26} pending={3} />
);

export const WithAccrual: Story = () => (
  <BalanceMeter entitlement={25} used={10} pending={2} accrual={3} />
);

export const WithBreakdown: Story = () => (
  <BalanceMeter
    entitlement={25}
    used={8}
    pending={2}
    breakdown={[
      { label: 'Annual leave', used: 6, entitlement: 20 },
      { label: 'Sick', used: 2, entitlement: 5 },
      { label: 'TOIL', used: 0, entitlement: 3, color: 'var(--color-status-info)' },
    ]}
  />
);

export const NoLegend: Story = () => (
  <BalanceMeter entitlement={25} used={10} showLegend={false} />
);

export const Interactive: Story = () => (
  <BalanceMeter
    entitlement={25}
    used={10}
    pending={2}
    onSegmentClick={(kind) => alert(`Clicked: ${kind}`)}
  />
);

export const SizeSmall: Story = () => (
  <BalanceMeter entitlement={25} used={10} size="sm" />
);

export const SizeXSmall: Story = () => (
  <BalanceMeter entitlement={25} used={10} size="xs" />
);

export const BudgetDollarUnit: Story = () => (
  <BalanceMeter entitlement={150000} used={62000} pending={8000} unit="$" />
);
