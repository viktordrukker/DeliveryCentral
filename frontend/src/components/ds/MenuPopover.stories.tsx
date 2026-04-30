import type { Story } from '@ladle/react';
import { useRef, useState } from 'react';

import { Button } from './Button';
import { MenuPopover, type MenuItem } from './MenuPopover';

export default { title: 'DS / Surfaces / MenuPopover' };

export const RowActions: Story = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const items: MenuItem[] = [
    { key: 'edit', label: 'Edit', onSelect: () => alert('Edit') },
    { key: 'duplicate', label: 'Duplicate', onSelect: () => alert('Duplicate') },
    { key: 'archive', label: 'Archive', onSelect: () => alert('Archive') },
    { key: 'delete', label: 'Delete', danger: true, onSelect: () => alert('Delete') },
  ];
  return (
    <>
      <Button ref={ref as unknown as React.Ref<HTMLButtonElement>} size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
        ⋯ Actions
      </Button>
      <MenuPopover open={open} onClose={() => setOpen(false)} anchorRef={ref} items={items} />
    </>
  );
};

export const WithDisabledItem: Story = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const items: MenuItem[] = [
    { key: 'a', label: 'Available' },
    { key: 'b', label: 'Disabled — out of scope', disabled: true },
    { key: 'c', label: 'Another available' },
  ].map((item) => ({ ...item, onSelect: () => alert(item.key) }));
  return (
    <>
      <Button ref={ref as unknown as React.Ref<HTMLButtonElement>} size="sm" onClick={() => setOpen((v) => !v)}>
        Open menu
      </Button>
      <MenuPopover open={open} onClose={() => setOpen(false)} anchorRef={ref} items={items} />
    </>
  );
};
