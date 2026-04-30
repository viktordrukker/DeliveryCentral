import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Button } from './Button';
import { Modal, type ModalSize } from './Modal';

export default { title: 'DS / Surfaces / Modal' };

const SIZES: ModalSize[] = ['sm', 'md', 'lg', 'xl', 'fullscreen'];

function ModalDemo({ size }: { size?: ModalSize }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open ({size ?? 'md'})</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Modal — size ${size ?? 'md'}`}
        description="Body scroll is locked. Press Escape, click the backdrop, or use the buttons to close."
        size={size}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setOpen(false)} data-autofocus="true">OK</Button>
          </>
        }
      >
        <p>Body content. Tab through and verify focus stays inside the modal.</p>
        <p>Resize the viewport to ≤640px — the modal should fill the screen edge-to-edge.</p>
      </Modal>
    </>
  );
}

export const Default: Story = () => <ModalDemo />;
export const Small: Story = () => <ModalDemo size="sm" />;
export const Large: Story = () => <ModalDemo size="lg" />;
export const ExtraLarge: Story = () => <ModalDemo size="xl" />;
export const Fullscreen: Story = () => <ModalDemo size="fullscreen" />;

export const AllSizes: Story = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {SIZES.map((size) => <ModalDemo key={size} size={size} />)}
  </div>
);

export const Stacked: Story = () => {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  return (
    <>
      <Button onClick={() => setOuter(true)}>Open outer</Button>
      <Modal open={outer} onClose={() => setOuter(false)} title="Outer">
        <p>This is the outer modal. Open another to test stacking.</p>
        <Button onClick={() => setInner(true)}>Open inner</Button>
        <Modal open={inner} onClose={() => setInner(false)} title="Inner" size="sm">
          <p>Inner modal — paints above the outer one. Closing this restores focus to the outer.</p>
          <Button onClick={() => setInner(false)}>Close inner</Button>
        </Modal>
      </Modal>
    </>
  );
};
