import { useMemo, useState } from 'react';

import { DatePicker, FormField, FormModal } from '@/components/ds';
import { scheduleOnboarding } from '@/lib/api/assignments';

interface OnboardingScheduleModalProps {
  open: boolean;
  assignmentId: string;
  /** Assignment's `validFrom`, ISO 8601. Used as the upper bound for `onboardingDate`. */
  assignmentStartDate: string;
  onCancel: () => void;
  onScheduled: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Captures the onboarding date (paperwork-start day) for a BOOKED assignment
 * and transitions it to ONBOARDING. The date is bounded by today (lower) and
 * the assignment's start date (upper) so the inversion is impossible.
 */
export function OnboardingScheduleModal(
  props: OnboardingScheduleModalProps,
): JSX.Element | null {
  if (!props.open) return null;
  return <OnboardingScheduleModalInner {...props} />;
}

function OnboardingScheduleModalInner({
  open,
  assignmentId,
  assignmentStartDate,
  onCancel,
  onScheduled,
}: OnboardingScheduleModalProps): JSX.Element {
  const startDateOnly = toDateOnly(assignmentStartDate);
  const min = useMemo(() => {
    const today = todayIso();
    return today > startDateOnly ? startDateOnly : today;
  }, [startDateOnly]);

  const [onboardingDate, setOnboardingDate] = useState<string>(min);
  const [error, setError] = useState<string | undefined>(undefined);

  const isInvalid = !onboardingDate || onboardingDate > startDateOnly || onboardingDate < min;
  const inversionMsg =
    onboardingDate && onboardingDate > startDateOnly
      ? `Onboarding date must be on or before the assignment start date (${startDateOnly}).`
      : undefined;

  async function handleSubmit(): Promise<void> {
    setError(undefined);
    try {
      await scheduleOnboarding(assignmentId, { onboardingDate });
      onScheduled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not schedule onboarding.');
      throw err;
    }
  }

  return (
    <FormModal
      open={open}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      title="Schedule onboarding"
      description="Pick the day onboarding paperwork begins. The system transitions the assignment to ONBOARDING."
      size="sm"
      submitLabel="Schedule"
      submitDisabled={isInvalid}
      dirty={Boolean(onboardingDate)}
      testId="onboarding-schedule-modal"
    >
      <FormField
        label="Onboarding date"
        required
        hint={`Must be between today and the assignment start date (${startDateOnly}).`}
        error={inversionMsg ?? error}
      >
        <DatePicker
          value={onboardingDate}
          onValueChange={setOnboardingDate}
          min={min}
          max={startDateOnly}
          aria-label="Onboarding date"
          invalid={isInvalid}
        />
      </FormField>
      <FormField label="Assignment start date" hint="Read-only — the assignment's planned start.">
        <DatePicker
          value={startDateOnly}
          onValueChange={() => undefined}
          aria-label="Assignment start date"
          disabled
        />
      </FormField>
    </FormModal>
  );
}
