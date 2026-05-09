import { useEffect, useRef, useState } from 'react';

import { Button, Modal, Popover } from '@/components/ds';
import type { TourStep } from '@/lib/onboarding-tours';

// HD-9 Chunk 5 — renderer for a single tour step. Anchor === null →
// centered Modal (focus trap, ESC, scroll lock from the existing
// primitive). Anchor !== null → DS Popover anchored to a `[data-tour]`
// element. Both render the title/body + Skip/Back/Next/Done controls.
//
// WCAG 2.2 AA: Modal already provides focus trap + ESC + portal +
// `role="dialog"` + `aria-modal="true"`. Popover step adds explicit
// dialog semantics (the DS Popover doesn't claim them by default).

interface OnboardingTourStepProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function OnboardingTourStep({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  onComplete,
}: OnboardingTourStepProps): JSX.Element | null {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  const controls = (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        gap: 'var(--space-2)',
        justifyContent: 'space-between',
        marginTop: 'var(--space-3)',
      }}
    >
      <Button variant="ghost" size="sm" type="button" onClick={onSkip}>
        Skip tour
      </Button>
      <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
        Step {stepIndex + 1} of {totalSteps}
      </span>
      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
        {!isFirst ? (
          <Button variant="secondary" size="sm" type="button" onClick={onBack}>
            Back
          </Button>
        ) : null}
        {isLast ? (
          <Button variant="primary" size="sm" type="button" onClick={onComplete}>
            Done
          </Button>
        ) : (
          <Button variant="primary" size="sm" type="button" onClick={onNext}>
            Next
          </Button>
        )}
      </div>
    </div>
  );

  const body = (
    <p style={{ color: 'var(--color-text)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
      {step.body}
    </p>
  );

  // Centered modal step (anchor === null).
  if (step.anchor === null) {
    return (
      <Modal open onClose={onSkip} title={step.title} size="sm">
        {body}
        {controls}
      </Modal>
    );
  }

  // Anchored popover step. Resolve the DOM target by `data-tour`.
  return <AnchoredPopoverStep step={step} title={step.title} body={body} controls={controls} onSkip={onSkip} />;
}

interface AnchoredPopoverStepProps {
  step: TourStep;
  title: string;
  body: JSX.Element;
  controls: JSX.Element;
  onSkip: () => void;
}

function AnchoredPopoverStep({
  step,
  title,
  body,
  controls,
  onSkip,
}: AnchoredPopoverStepProps): JSX.Element | null {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  // Locate the target element by `data-tour` selector. Re-poll on
  // route changes / re-renders since steps can target elements that
  // mount asynchronously.
  useEffect(() => {
    if (!step.anchor) return;
    const el = document.querySelector(`[data-tour="${step.anchor}"]`);
    setAnchorEl(el instanceof HTMLElement ? el : null);
  }, [step.anchor]);

  // If the anchor isn't in the DOM (e.g., a step targets an element
  // not on the current route), fall back to a centered modal so the
  // tour never traps the user. Skip lets them dismiss.
  if (!anchorEl) {
    return (
      <Modal open onClose={onSkip} title={title} size="sm">
        {body}
        {controls}
      </Modal>
    );
  }

  return (
    <>
      {/* Hidden fallback ref the Popover requires — DS Popover takes a RefObject. */}
      <div ref={fallbackRef} style={{ display: 'none' }} aria-hidden />
      <Popover
        open
        anchorRef={{ current: anchorEl } as React.RefObject<HTMLElement>}
        onClose={onSkip}
        placement="bottom-start"
      >
        <div
          role="dialog"
          aria-modal="false"
          aria-label={title}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-modal)',
            maxWidth: 360,
            padding: 'var(--space-4)',
          }}
        >
          <h3
            style={{
              color: 'var(--color-text)',
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
              marginBottom: 'var(--space-2)',
            }}
          >
            {title}
          </h3>
          {body}
          {controls}
        </div>
      </Popover>
    </>
  );
}
