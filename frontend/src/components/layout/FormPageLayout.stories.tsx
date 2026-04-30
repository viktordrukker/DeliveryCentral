import type { Story } from '@ladle/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { Button, FormField, Input, Textarea } from '@/components/ds';
import { SectionCard } from '@/components/common/SectionCard';

import { FormPageLayout } from './FormPageLayout';

export default { title: 'DS / Layout / FormPageLayout' };

export const Basic: Story = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  return (
    <MemoryRouter>
      <FormPageLayout
        eyebrow="Projects"
        title="Create Project"
        subtitle="Add a new project to the registry."
        actions={<Button variant="secondary">Back</Button>}
      >
        <SectionCard title="Project basics">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <FormField label="Name" required>
              {(props) => (
                <Input value={name} onChange={(e) => setName(e.target.value)} {...props} />
              )}
            </FormField>
            <FormField label="Description" hint="Plain text. Markdown not supported.">
              {(props) => (
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  {...props}
                />
              )}
            </FormField>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="primary">Create</Button>
              <Button variant="secondary">Cancel</Button>
            </div>
          </div>
        </SectionCard>
      </FormPageLayout>
    </MemoryRouter>
  );
};

export const WithStickyFooter: Story = () => {
  const [name, setName] = useState('');
  return (
    <MemoryRouter>
      <FormPageLayout
        eyebrow="Cases"
        title="Create case"
        subtitle="Long form — submit/cancel stick to the bottom while you scroll."
        actions={<Button variant="secondary">Back</Button>}
        stickyFooter={
          <>
            <Button variant="secondary">Cancel</Button>
            <Button variant="primary">Create case</Button>
          </>
        }
      >
        <SectionCard title="Section 1 of 3">
          <FormField label="Subject" required>
            {(props) => (
              <Input value={name} onChange={(e) => setName(e.target.value)} {...props} />
            )}
          </FormField>
        </SectionCard>
        <SectionCard title="Section 2 of 3">
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            (more form fields here…)
          </p>
        </SectionCard>
        <SectionCard title="Section 3 of 3">
          <div style={{ height: 400, color: 'var(--color-text-subtle)' }}>
            Scroll down — sticky footer stays in view.
          </div>
        </SectionCard>
      </FormPageLayout>
    </MemoryRouter>
  );
};

export const WithBanners: Story = () => (
  <MemoryRouter>
    <FormPageLayout
      eyebrow="Leave"
      title="Submit leave request"
      banners={
        <SectionCard>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
            ⚠️ You have 3 unsaved drafts. Loading them now.
          </p>
        </SectionCard>
      }
    >
      <SectionCard title="Leave details">
        <FormField label="Reason" required>
          {(props) => <Textarea rows={3} {...props} />}
        </FormField>
      </SectionCard>
    </FormPageLayout>
  </MemoryRouter>
);
