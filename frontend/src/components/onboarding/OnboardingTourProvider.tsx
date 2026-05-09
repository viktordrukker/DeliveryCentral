import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { useOnboardingTour, type UseOnboardingTourResult } from '@/features/onboarding/useOnboardingTour';

import { OnboardingTourStep } from './OnboardingTourModal';

// HD-9 Chunk 5 — provider mounted in `AppShell`. Owns:
//   - the `useOnboardingTour('welcome')` state machine
//   - auto-trigger logic (open the tour on first mount when the user
//     has no progress row)
//   - exposes `start()` to descendants via context (for the "Take the
//     tour" link on the Help Center page)
//
// The provider renders the active tour step (modal or popover) into
// the DOM whenever `status === 'running'`. When idle, it renders only
// children — no overlay, no portal cost.

interface TourTriggerContextValue {
  /** Re-open the welcome tour from step 0. Safe even after completion. */
  startWelcomeTour: () => void;
  /** True when the user has previously completed OR dismissed the tour.
   *  Useful for showing a "Replay tour" affordance vs "Take the tour". */
  alreadySeenWelcome: boolean | null;
}

const TourTriggerContext = createContext<TourTriggerContextValue | null>(null);

export function useTourTrigger(): TourTriggerContextValue {
  const ctx = useContext(TourTriggerContext);
  if (!ctx) {
    // Outside an OnboardingTourProvider — return a no-op shape so the
    // hook is safe to use in test stubs / unauthenticated routes.
    return {
      startWelcomeTour: () => {},
      alreadySeenWelcome: null,
    };
  }
  return ctx;
}

interface OnboardingTourProviderProps {
  children: ReactNode;
}

export function OnboardingTourProvider({ children }: OnboardingTourProviderProps): JSX.Element {
  const tour: UseOnboardingTourResult = useOnboardingTour('welcome');

  // Auto-trigger: when the user has never completed/dismissed the tour
  // (alreadySeen === false), open it once on mount. The hook's internal
  // fetch sets `alreadySeen` after BE returns; we react to its first
  // `false` value.
  useEffect(() => {
    if (tour.alreadySeen === false && tour.status === 'idle') {
      tour.start();
    }
    // We intentionally only re-evaluate when `alreadySeen` flips. The
    // tour's status transitions are driven by user input; auto-triggering
    // again on status changes would be wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.alreadySeen]);

  const ctxValue = useMemo<TourTriggerContextValue>(
    () => ({
      startWelcomeTour: tour.start,
      alreadySeenWelcome: tour.alreadySeen,
    }),
    [tour.start, tour.alreadySeen],
  );

  return (
    <TourTriggerContext.Provider value={ctxValue}>
      {children}
      {tour.status === 'running' && tour.step ? (
        <OnboardingTourStep
          step={tour.step}
          stepIndex={tour.stepIndex}
          totalSteps={tour.totalSteps}
          onNext={tour.next}
          onBack={tour.back}
          onSkip={() => void tour.skip()}
          onComplete={() => void tour.complete()}
        />
      ) : null}
    </TourTriggerContext.Provider>
  );
}
