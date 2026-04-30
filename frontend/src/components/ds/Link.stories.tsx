import type { Story } from '@ladle/react';

import { Link } from './Link';

export default { title: 'DS / Link' };

export const Default: Story = () => <Link href="#">Visit project</Link>;

export const Sizes: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <Link href="#" size="xs">xs link</Link>
    <Link href="#" size="sm">sm link</Link>
    <Link href="#" size="md">md link</Link>
  </div>
);

export const Muted: Story = () => <Link href="#" muted>Muted variant</Link>;
