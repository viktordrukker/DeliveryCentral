import { useCallback, useEffect, useState } from 'react';

import {
  getTourProgress,
  upsertTourProgress,
  type OnboardingTourProgress,
} from '@/lib/api/help';
import {
  findTour,
  type TourDefinition,
  type TourStep,
} from '@/lib/onboarding-tours';

// HD-9 Chunk 5 — onboarding tour state machine.
//
// State machine: idle (modal closed) → step 0 (intro/centered) → step
// 1..N-1 (popover-anchored) → completed | dismissed.
//
// Progress sync: only fires on Skip + Complete (NOT on every step) to
// keep server writes minimal. The endpoint is idempotent so retries
// are safe.

export type TourStatus = 'idle' | 'running' | 'completed' | 'dismissed';

export interface UseOnboardingTourResult {
  status: TourStatus;
  step: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  /** Open the tour from step 0. Safe to call repeatedly — re-opens. */
  start: () => void;
  next: () => void;
  back: () => void;
  /** Sets `dismissedAt` server-side and closes. */
  skip: () => Promise<void>;
  /** Sets `completedAt` server-side and closes. */
  complete: () => Promise<void>;
  /** Has the user previously completed OR dismissed this tour? Loaded from BE. */
  alreadySeen: boolean | null;
}

export function useOnboardingTour(tourKey: string): UseOnboardingTourResult {
  const tour: TourDefinition | undefined = findTour(tourKey);

  const [status, setStatus] = useState<TourStatus>('idle');
  const [stepIndex, setStepIndex] = useState<number>(0);
  // null = still loading; true/false = decision known
  const [alreadySeen, setAlreadySeen] = useState<boolean | null>(null);

  // On mount, fetch the user's progress to decide whether to auto-open.
  // The provider component (mounted in AppShell) reads `alreadySeen`
  // and calls `start()` only when it's false AND the platform setting
  // is enabled.
  useEffect(() => {
    if (!tour) {
      setAlreadySeen(true);
      return;
    }
    let active = true;
    void getTourProgress(tour.tourKey)
      .then((row: OnboardingTourProgress) => {
        if (!active) return;
        const seen = (row.completedAt ?? null) !== null || (row.dismissedAt ?? null) !== null;
        setAlreadySeen(seen);
      })
      .catch(() => {
        // Failure (network, auth) — assume not-seen-yet so we don't
        // accidentally hide the tour from a brand-new user.
        if (active) setAlreadySeen(false);
      });
    return () => {
      active = false;
    };
  }, [tour]);

  const start = useCallback(() => {
    if (!tour) return;
    setStepIndex(0);
    setStatus('running');
  }, [tour]);

  const next = useCallback(() => {
    if (!tour) return;
    setStepIndex((i) => Math.min(i + 1, tour.steps.length - 1));
  }, [tour]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const skip = useCallback(async () => {
    if (!tour) return;
    setStatus('dismissed');
    try {
      await upsertTourProgress(tour.tourKey, { dismissed: true });
    } catch {
      // Best-effort persist; the tour stays dismissed in this session
      // even if the upsert fails (the user clearly chose to dismiss).
    }
    setAlreadySeen(true);
  }, [tour]);

  const complete = useCallback(async () => {
    if (!tour) return;
    setStatus('completed');
    try {
      await upsertTourProgress(tour.tourKey, {
        completed: true,
        completedSteps: tour.steps.map((s) => s.key),
      });
    } catch {
      // Idempotent on retry; silent failure is acceptable.
    }
    setAlreadySeen(true);
  }, [tour]);

  const step: TourStep | null = tour && status === 'running' ? tour.steps[stepIndex] ?? null : null;

  return {
    status,
    step,
    stepIndex,
    totalSteps: tour?.steps.length ?? 0,
    start,
    next,
    back,
    skip,
    complete,
    alreadySeen,
  };
}
