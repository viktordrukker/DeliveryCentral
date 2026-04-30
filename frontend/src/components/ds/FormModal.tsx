import { FormEvent, ReactNode, useState } from 'react';

import { Button } from './Button';
import { Modal, type ModalSize } from './Modal';

interface FormModalProps {
  open: boolean;
  /** Called on Cancel, backdrop click, Escape — when the form is NOT dirty. */
  onCancel: () => void;
  /** Submit handler. Async returning a promise is fine; the loading state is
   *  shown while the promise is pending. Throw to keep the modal open and
   *  surface an error to the caller. */
  onSubmit: () => void | Promise<void>;
  title: ReactNode;
  description?: ReactNode;
  size?: ModalSize;
  /** Label on the primary action. Default: "Save". */
  submitLabel?: string;
  /** Label on the secondary action. Default: "Cancel". */
  cancelLabel?: string;
  /** Disable submit (e.g. validation failing). */
  submitDisabled?: boolean;
  /** Indicates the form has unsaved changes. When true, Cancel/backdrop/Escape
   *  prompts a `window.confirm()` before closing. */
  dirty?: boolean;
  /** Tone of the primary button. Default: 'primary'. Use 'danger' for destructive
   *  forms (e.g. terminate flow). */
  tone?: 'primary' | 'danger';
  testId?: string;
  children?: ReactNode;
}

/**
 * Form-shaped modal: wraps `<Modal>` with a `<form>` body and a sticky
 * footer with primary/secondary actions. Tracks submit-pending state and
 * blocks closing while submitting; prompts on close-with-dirty-state.
 *
 * Used for: create/edit dialogs (replaces CreateAssignmentModal,
 * DetailedStatusModal, OverrideModal, DimensionDetailModal,
 * PlannerDraft/Extend, BatchAssignmentConfirmModal, TeamBuilderModal —
 * see DS-2-7).
 */
export function FormModal({
  open,
  onCancel,
  onSubmit,
  title,
  description,
  size = 'md',
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitDisabled = false,
  dirty = false,
  tone = 'primary',
  testId,
  children,
}: FormModalProps): JSX.Element {
  const [submitting, setSubmitting] = useState<boolean>(false);

  function attemptClose(): void {
    if (submitting) return;
    if (dirty) {
      // eslint-disable-next-line no-alert -- intentional: confirm-discard at the
      // boundary is acceptable; UX migration to a styled prompt happens once
      // FormModal usage has settled. ConfirmDialog stacks under FormModal which
      // would create a confusing double-modal flow.
      const proceed = typeof window !== 'undefined' ? window.confirm('Discard your changes?') : true;
      if (!proceed) return;
    }
    onCancel();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitDisabled || submitting) return;
    try {
      setSubmitting(true);
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  }

  // While submitting, suppress backdrop/escape close.
  return (
    <Modal
      open={open}
      onClose={attemptClose}
      title={title}
      description={description}
      size={size}
      closeOnBackdropClick={!submitting}
      closeOnEscape={!submitting}
      testId={testId}
      footer={
        <>
          <Button variant="secondary" onClick={attemptClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            type="submit"
            form={testId ? `${testId}-form` : undefined}
            disabled={submitDisabled}
            loading={submitting}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={testId ? `${testId}-form` : undefined} className="ds-form-modal__form" onSubmit={handleSubmit}>
        {children}
      </form>
    </Modal>
  );
}

