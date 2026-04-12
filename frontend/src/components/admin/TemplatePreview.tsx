import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { NotificationTemplate } from '@/lib/api/notifications';

interface TemplatePreviewProps {
  template: NotificationTemplate | null;
}

export function TemplatePreview({ template }: TemplatePreviewProps): JSX.Element {
  if (!template) {
    return (
      <SectionCard>
        <EmptyState
          description="Select a notification template to preview its configured message structure."
          title="No template selected"
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Template Preview">
      <div className="details-summary-grid">
        <div className="section-card metadata-detail__stat">
          <span className="metric-card__label">Display Name</span>
          <strong>{template.displayName}</strong>
        </div>
        <div className="section-card metadata-detail__stat">
          <span className="metric-card__label">Event</span>
          <strong>{template.eventName}</strong>
        </div>
        <div className="section-card metadata-detail__stat">
          <span className="metric-card__label">Channel</span>
          <strong>{template.channelKey}</strong>
        </div>
        <div className="section-card metadata-detail__stat">
          <span className="metric-card__label">Subject</span>
          <strong>{template.subjectTemplate ?? 'No subject template'}</strong>
        </div>
      </div>

      <div className="workflow-panel">
        <div className="field">
          <span className="field__label">Body Template</span>
          <pre className="template-preview__body">{template.bodyTemplate}</pre>
        </div>
      </div>
    </SectionCard>
  );
}
