// HD-9 Chunk 5 — onboarding tour definitions.
//
// Tours live in code (not BE). The BE persists ONLY per-user progress
// rows keyed by `(personId, tourKey)`. Definitions can change with FE
// deploys without a migration.
//
// Anchor convention: each step's `anchor` is either
//   - null  → render a centered <Modal> step (welcome / sign-off),
//   - 'data-tour=KEY' → match a DOM element with `[data-tour="KEY"]` and
//                       render an anchored <Popover>.
// Add the matching `data-tour="KEY"` attribute to the target element.

export interface TourStep {
  /** Stable key — persisted in `OnboardingTourProgress.completedSteps[]`. */
  key: string;
  /** `null` = centered modal step; otherwise a `[data-tour="KEY"]` selector. */
  anchor: string | null;
  title: string;
  body: string;
  /** Optional route to navigate to before showing this step. */
  route?: string;
}

export interface TourDefinition {
  tourKey: string;
  /** Human-readable label for the "Take the tour" entry point on /help. */
  label: string;
  steps: TourStep[];
}

// v1 — single universal welcome tour (5 steps). Per-role variants land
// later as additional tour keys.
export const WELCOME_TOUR: TourDefinition = {
  tourKey: 'welcome',
  label: 'Welcome to DeliveryCentral',
  steps: [
    {
      key: 'intro',
      anchor: null,
      title: 'Welcome to DeliveryCentral',
      body: "We'll show you the five places you'll visit most. Click Next to start, or Skip to dismiss this tour — you can replay it any time from the Help Center.",
    },
    {
      key: 'sidebar',
      anchor: 'sidebar-overview',
      title: 'Navigate from the sidebar',
      body: 'The sidebar groups everything by what you do — dashboard, people, work, governance, evidence. Items hide automatically based on your role.',
    },
    {
      key: 'dashboard',
      anchor: 'dashboard-link',
      title: 'Your dashboard',
      body: 'Your dashboard is the daily landing surface. KPIs are clickable drilldowns — every number leads to the rows that produced it.',
    },
    {
      key: 'my-time',
      anchor: 'my-time-link',
      title: 'Track your time',
      body: 'Submit weekly timesheets, request leave, and see your monthly summary in one place.',
    },
    {
      key: 'notifications',
      anchor: 'notifications-link',
      title: 'Stay on top of approvals',
      body: 'New nudges, approvals, and case updates show up here. Click Done to finish the tour — visit the Help Center any time for more.',
    },
  ],
};

export const ALL_TOURS: TourDefinition[] = [WELCOME_TOUR];

export function findTour(tourKey: string): TourDefinition | undefined {
  return ALL_TOURS.find((t) => t.tourKey === tourKey);
}
