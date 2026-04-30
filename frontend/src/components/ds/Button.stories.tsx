import type { Story } from '@ladle/react';

import { Button, type ButtonVariant, type ButtonSize } from './Button';

export default {
  title: 'DS / Button',
};

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'link'];
const SIZES: ButtonSize[] = ['xs', 'sm', 'md', 'lg'];

function row(label: string, children: React.ReactNode) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <span style={{ width: 100, fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

export const Primary: Story = () => <Button variant="primary">Primary action</Button>;
export const Secondary: Story = () => <Button variant="secondary">Secondary</Button>;
export const Ghost: Story = () => <Button variant="ghost">Ghost</Button>;
export const Danger: Story = () => <Button variant="danger">Delete</Button>;
export const LinkVariant: Story = () => <Button variant="link">Inline link</Button>;

export const AllVariants: Story = () => (
  <div>
    {VARIANTS.map((variant) => row(variant, <Button variant={variant}>{variant}</Button>))}
  </div>
);

export const AllSizes: Story = () => (
  <div>
    {SIZES.map((size) => row(size, <Button size={size}>{size.toUpperCase()}</Button>))}
  </div>
);

export const VariantsTimesSizes: Story = () => (
  <div>
    {VARIANTS.map((variant) =>
      row(variant, SIZES.map((size) => <Button key={size} variant={variant} size={size}>{size}</Button>)),
    )}
  </div>
);

export const Loading: Story = () => (
  <div>
    {row('idle', <Button variant="primary">Submit</Button>)}
    {row('loading', <Button variant="primary" loading>Submit</Button>)}
    {row('secondary loading', <Button variant="secondary" loading>Submit</Button>)}
  </div>
);

export const Disabled: Story = () => (
  <div>
    {row('button', <Button disabled>Disabled</Button>)}
    {row('a (aria-disabled)', <Button as="a" href="#" disabled>Disabled link</Button>)}
  </div>
);

export const WithIcons: Story = () => (
  <div>
    {row('leading', <Button leadingIcon={<span aria-hidden>+</span>}>Create</Button>)}
    {row('trailing', <Button trailingIcon={<span aria-hidden>→</span>}>Continue</Button>)}
    {row('both', <Button leadingIcon="+" trailingIcon="→">Both</Button>)}
  </div>
);

export const Polymorphic: Story = () => (
  <div>
    {row('button', <Button>native button</Button>)}
    {row('anchor', <Button as="a" href="#story">anchor</Button>)}
  </div>
);
