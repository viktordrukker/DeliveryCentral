import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Button } from './Button';
import { FormModal } from './FormModal';
import { Input } from './Input';
import { Textarea } from './Textarea';

export default { title: 'DS / Surfaces / FormModal' };

export const CreateProject: Story = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const dirty = name !== '' || notes !== '';
  async function handleSubmit() {
    // Simulate a network round-trip so the loading spinner is visible.
    await new Promise((r) => setTimeout(r, 800));
    alert(`Submitted: name=${name}, notes=${notes}`);
    setName('');
    setNotes('');
    setOpen(false);
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}>New project</Button>
      <FormModal
        open={open}
        onCancel={() => setOpen(false)}
        onSubmit={handleSubmit}
        title="Create project"
        description="Submitting waits 800ms; Cancel/backdrop/Escape on a dirty form prompts."
        submitLabel="Create"
        submitDisabled={!name.trim()}
        dirty={dirty}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Name *</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" autoFocus />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Notes</span>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </FormModal>
    </>
  );
};

export const DangerTone: Story = () => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  async function handleSubmit() {
    await new Promise((r) => setTimeout(r, 600));
    alert(`Terminated. Reason: ${reason}`);
    setReason('');
    setOpen(false);
  }
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Terminate employee…</Button>
      <FormModal
        open={open}
        onCancel={() => setOpen(false)}
        onSubmit={handleSubmit}
        title="Terminate employee"
        description="This is permanent. The reason will be logged."
        submitLabel="Terminate"
        tone="danger"
        submitDisabled={!reason.trim()}
        dirty={reason !== ''}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Reason *</span>
          <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </FormModal>
    </>
  );
};
