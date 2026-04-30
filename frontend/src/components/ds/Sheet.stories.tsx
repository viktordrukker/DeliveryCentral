import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Button } from './Button';
import { Sheet } from './Sheet';

export default { title: 'DS / Surfaces / Sheet' };

export const Default: Story = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open sheet</Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        description="Bottom-anchored panel. Drag handle is decorative; use Escape or backdrop to close."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Apply</Button>
          </>
        }
      >
        <p>Sheet body content. Try resizing — desktop centers and caps height; mobile fills bottom.</p>
      </Sheet>
    </>
  );
};
