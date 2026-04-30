import type { Story } from '@ladle/react';
import { useRef, useState } from 'react';

import { Button } from './Button';
import { Popover, type PopoverPlacement } from './Popover';

export default { title: 'DS / Surfaces / Popover' };

const PLACEMENTS: PopoverPlacement[] = ['bottom-start', 'bottom-end', 'top-start', 'top-end', 'right', 'left'];

function PopoverDemo({ placement }: { placement: PopoverPlacement }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={ref as unknown as React.Ref<HTMLButtonElement>} size="sm" onClick={() => setOpen((v) => !v)}>
        {placement}
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} placement={placement}>
        <div style={{ padding: 12, fontSize: 12 }}>
          <strong>Popover</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)' }}>Placement: {placement}</p>
        </div>
      </Popover>
    </>
  );
}

export const AllPlacements: Story = () => (
  <div
    style={{
      minHeight: 400,
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 120px)',
      gap: 12,
      padding: 100,
    }}
  >
    {PLACEMENTS.map((p) => <PopoverDemo key={p} placement={p} />)}
  </div>
);

export const Default: Story = () => <PopoverDemo placement="bottom-start" />;
