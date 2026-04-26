export interface ExceptionAction {
  label: string;
  href: (projectId: string) => string;
  diagnostic: string;
}

export const EXCEPTION_ACTIONS: Record<string, ExceptionAction> = {
  staffingFillRate: {
    label: 'Re-plan allocations',
    href: (pid) => `/staffing-desk?view=planner&projectId=${pid}`,
    diagnostic: 'Role plan is under-filled vs. approved allocations.',
  },
  overAllocationRate: {
    label: 'Rebalance team',
    href: (pid) => `/staffing-desk?view=planner&projectId=${pid}&mode=rebalance`,
    diagnostic: 'Team members are allocated above 100% across projects.',
  },
  keyPersonRisk: {
    label: 'Review role coverage',
    href: (pid) => `/projects/${pid}?tab=team`,
    diagnostic: 'Critical skills are covered by fewer than 2 people.',
  },
  teamMood: {
    label: 'Open People 360',
    href: (pid) => `/projects/${pid}?tab=team`,
    diagnostic: 'Team pulse mood dropped below acceptable threshold.',
  },
  costPerformanceIndex: {
    label: 'Open budget review',
    href: (pid) => `/projects/${pid}?tab=budget`,
    diagnostic: 'CPI below 0.85 — earned value lagging actual cost.',
  },
  spendRate: {
    label: 'Open budget review',
    href: (pid) => `/projects/${pid}?tab=budget`,
    diagnostic: 'Spend is outpacing plan-to-date significantly.',
  },
  forecastAccuracy: {
    label: 'Update forecast',
    href: (pid) => `/projects/${pid}?tab=budget`,
    diagnostic: 'EAC drifts from BAC beyond tolerance.',
  },
  capexCompliance: {
    label: 'Reclassify CAPEX/OPEX',
    href: (pid) => `/projects/${pid}?tab=budget`,
    diagnostic: 'CAPEX classification correctness below target.',
  },
  timelineDeviation: {
    label: 'Adjust forecast end date',
    href: (pid) => `/projects/${pid}?tab=milestones`,
    diagnostic: 'Forecast end date slipped beyond baseline.',
  },
  criticalPathHealth: {
    label: 'Review critical path',
    href: (pid) => `/projects/${pid}?tab=milestones`,
    diagnostic: 'Critical path float is negative or at zero.',
  },
  milestoneAdherence: {
    label: 'Open milestones',
    href: (pid) => `/projects/${pid}?tab=milestones`,
    diagnostic: 'Milestone hit rate is below 60% in last 56 days.',
  },
  velocityTrend: {
    label: 'Open timesheets review',
    href: (pid) => `/dashboards/planned-vs-actual?projectId=${pid}`,
    diagnostic: 'Velocity is diverging from planned capacity.',
  },
  scopeCreep: {
    label: 'Open change requests',
    href: (pid) => `/projects/${pid}?tab=change-requests&filter=outOfBaseline`,
    diagnostic: 'Approved out-of-baseline changes exceed scope tolerance.',
  },
  changeRequestBurden: {
    label: 'Review pending CRs',
    href: (pid) => `/projects/${pid}?tab=change-requests&filter=proposed`,
    diagnostic: 'Weighted change-request load is high vs. project size.',
  },
  requirementsStability: {
    label: 'Open change requests',
    href: (pid) => `/projects/${pid}?tab=change-requests`,
    diagnostic: 'Too many approved requirement changes in last 4 weeks.',
  },
  deliverableAcceptance: {
    label: 'Log evidence',
    href: (pid) => `/work-evidence?projectId=${pid}`,
    diagnostic: 'Deliverable first-review acceptance rate is below target.',
  },
};

export function exceptionActionFor(subDimensionKey: string): ExceptionAction | null {
  return EXCEPTION_ACTIONS[subDimensionKey] ?? null;
}
