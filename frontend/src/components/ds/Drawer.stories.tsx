import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Button } from './Button';
import { Drawer, type DrawerSide, type DrawerWidth } from './Drawer';

export default { title: 'DS / Surfaces / Drawer' };

function DrawerDemo({ side, width }: { side?: DrawerSide; width?: DrawerWidth }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open {side ?? 'right'} / {width ?? 'md'}</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side={side}
        width={width}
        title={`Drawer — ${side ?? 'right'} / ${width ?? 'md'}`}
        description="Slide-in side panel. Backdrop click and Escape both close."
        footer={
          <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
        }
      >
        <p>Drawer body content goes here. On mobile (≤640px) the drawer fills the viewport regardless of side.</p>
      </Drawer>
    </>
  );
}

export const RightDefault: Story = () => <DrawerDemo />;
export const Left: Story = () => <DrawerDemo side="left" />;
export const Small: Story = () => <DrawerDemo width="sm" />;
export const Large: Story = () => <DrawerDemo width="lg" />;
