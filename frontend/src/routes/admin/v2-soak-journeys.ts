/**
 * MANUAL-CLICK-THROUGH-30 — journey definitions consumed by
 * `V2SoakChecklistPage`. The shape mirrors `docs/testing/v2-soak-journeys.json`
 * which is the source of truth for QA documentation. The frontend keeps a
 * typed copy so the checklist page renders without a docs-asset fetch.
 *
 * When journey definitions change, update both files in the same PR.
 */

export type SoakRole =
  | 'admin'
  | 'director'
  | 'delivery_manager'
  | 'hr_manager'
  | 'resource_manager'
  | 'project_manager'
  | 'employee'
  | 'dual_role';

export type SoakExpectedOutcome = 'PASS' | 'FAIL_EXPECTED' | 'NOT_APPLICABLE';

export interface SoakStep {
  action: string;
  target?: string;
  value?: string | number | boolean;
  fields?: Record<string, string | number | boolean>;
}

export interface SoakJourneyDefinition {
  id: string;
  title: string;
  persona: SoakRole;
  steps: SoakStep[];
  expectedOutcome: Record<SoakRole, SoakExpectedOutcome>;
  blockedBy: string | null;
  owner: string;
}

export const SOAK_ROLES: readonly SoakRole[] = [
  'admin',
  'director',
  'delivery_manager',
  'hr_manager',
  'resource_manager',
  'project_manager',
  'employee',
  'dual_role',
];

function fullPass(): Record<SoakRole, SoakExpectedOutcome> {
  return {
    admin: 'PASS',
    director: 'PASS',
    delivery_manager: 'PASS',
    hr_manager: 'PASS',
    resource_manager: 'PASS',
    project_manager: 'PASS',
    employee: 'PASS',
    dual_role: 'PASS',
  };
}

function passFor(roles: SoakRole[]): Record<SoakRole, SoakExpectedOutcome> {
  const out = Object.fromEntries(SOAK_ROLES.map((r) => [r, 'NOT_APPLICABLE' as SoakExpectedOutcome])) as Record<
    SoakRole,
    SoakExpectedOutcome
  >;
  for (const r of roles) out[r] = 'PASS';
  return out;
}

export const SOAK_JOURNEYS: readonly SoakJourneyDefinition[] = [
  {
    id: 'J-01',
    title: 'Employee logs in and sees dashboard',
    persona: 'employee',
    steps: [
      { action: 'navigate', target: '/login' },
      { action: 'fillForm', fields: { email: 'ethan.brooks@itco.local', password: 'EmployeePass1!' } },
      { action: 'submit' },
      { action: 'expectRoute', value: '/dashboard' },
    ],
    expectedOutcome: fullPass(),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-02',
    title: 'Employee submits a weekly timesheet',
    persona: 'employee',
    steps: [
      { action: 'navigate', target: '/timesheets' },
      { action: 'expectVisible', value: 'current-week row' },
      { action: 'fillCells', value: '5x8h across Mon-Fri' },
      { action: 'click', target: 'Submit for approval' },
      { action: 'expectToast', value: 'Timesheet submitted' },
    ],
    expectedOutcome: fullPass(),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-03',
    title: 'Employee requests leave',
    persona: 'employee',
    steps: [
      { action: 'navigate', target: '/leave' },
      { action: 'click', target: 'Request leave' },
      { action: 'fillForm', fields: { leaveType: 'VACATION', startDate: '+14d', endDate: '+18d' } },
      { action: 'submit' },
      { action: 'expectStatus', value: 'PENDING_APPROVAL' },
    ],
    expectedOutcome: fullPass(),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-04',
    title: 'Employee cancels their own leave request',
    persona: 'employee',
    steps: [
      { action: 'navigate', target: '/leave' },
      { action: 'selectRow', value: 'request from J-03' },
      { action: 'click', target: 'Cancel' },
      { action: 'confirmDialog' },
      { action: 'expectStatus', value: 'CANCELLED' },
    ],
    expectedOutcome: fullPass(),
    blockedBy: 'J-03',
    owner: 'QA',
  },
  {
    id: 'J-05',
    title: 'PM creates a new project position',
    persona: 'project_manager',
    steps: [
      { action: 'navigate', target: '/staffing-desk' },
      { action: 'click', target: 'New position' },
      { action: 'fillForm', fields: { project: 'Atlas', role: 'Senior Dev', fte: 1.0, startDate: '+7d' } },
      { action: 'submit' },
      { action: 'expectRoute', value: '/staffing-desk/positions/:id' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager', 'resource_manager', 'project_manager']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-06',
    title: 'PM bulk-reassigns 4 positions',
    persona: 'project_manager',
    steps: [
      { action: 'navigate', target: '/staffing-desk?view=board' },
      { action: 'selectRows', value: '4 positions' },
      { action: 'click', target: 'Bulk reassign' },
      { action: 'selectTarget', value: 'alternate org unit' },
      { action: 'submit' },
      { action: 'expectToast', value: '4 positions reassigned' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager', 'resource_manager', 'project_manager']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-07',
    title: 'PM approves a submitted timesheet',
    persona: 'project_manager',
    steps: [
      { action: 'navigate', target: '/approvals' },
      { action: 'filterTab', value: 'Timesheets' },
      { action: 'selectRow', value: 'first pending row' },
      { action: 'click', target: 'Approve' },
      { action: 'expectStatus', value: 'APPROVED' },
    ],
    expectedOutcome: {
      admin: 'PASS',
      director: 'PASS',
      delivery_manager: 'PASS',
      hr_manager: 'NOT_APPLICABLE',
      resource_manager: 'NOT_APPLICABLE',
      project_manager: 'PASS',
      employee: 'FAIL_EXPECTED',
      dual_role: 'NOT_APPLICABLE',
    },
    blockedBy: 'J-02',
    owner: 'QA',
  },
  {
    id: 'J-08',
    title: 'PM views project pulse',
    persona: 'project_manager',
    steps: [
      { action: 'navigate', target: '/projects' },
      { action: 'selectRow', value: 'Atlas' },
      { action: 'expectVisible', value: 'Project pulse card' },
      { action: 'expectVisible', value: 'Health score' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager', 'resource_manager', 'project_manager']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-09',
    title: 'RM runs auto-match candidates',
    persona: 'resource_manager',
    steps: [
      { action: 'navigate', target: '/staffing-desk?view=planner' },
      { action: 'selectRow', value: 'first open position' },
      { action: 'click', target: 'Auto-match' },
      { action: 'expectVisible', value: 'candidate ranking' },
      { action: 'expectMinResults', value: 1 },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager', 'resource_manager', 'project_manager', 'dual_role']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-10',
    title: 'RM proposes a candidate',
    persona: 'resource_manager',
    steps: [
      { action: 'navigate', target: '/staffing-desk?view=planner' },
      { action: 'selectRow', value: 'candidate from J-09' },
      { action: 'click', target: 'Propose' },
      { action: 'expectStatus', value: 'PROPOSED' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager', 'resource_manager', 'project_manager', 'dual_role']),
    blockedBy: 'J-09',
    owner: 'QA',
  },
  {
    id: 'J-11',
    title: 'RM views the bench',
    persona: 'resource_manager',
    steps: [
      { action: 'navigate', target: '/staffing-desk?view=bench' },
      { action: 'expectVisible', value: 'Bench KPI strip' },
      { action: 'expectMinRows', value: 1 },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager', 'hr_manager', 'resource_manager', 'dual_role']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-12',
    title: 'HR runs HR action cards',
    persona: 'hr_manager',
    steps: [
      { action: 'navigate', target: '/dashboard/hr' },
      { action: 'expectVisible', value: 'HR action cards' },
      { action: 'click', target: 'first card CTA' },
      { action: 'expectRoute', value: 'drilldown URL' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'hr_manager', 'dual_role']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-13',
    title: 'HR bulk-reassigns 6 people across org units',
    persona: 'hr_manager',
    steps: [
      { action: 'navigate', target: '/people' },
      { action: 'selectRows', value: '6 people' },
      { action: 'click', target: 'Bulk reassign' },
      { action: 'selectTarget', value: 'alternate org unit' },
      { action: 'submit' },
      { action: 'expectToast', value: '6 people reassigned' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'hr_manager', 'dual_role']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-14',
    title: 'HR configures a leave policy',
    persona: 'hr_manager',
    steps: [
      { action: 'navigate', target: '/admin/leave-policies' },
      { action: 'selectRow', value: 'VACATION' },
      { action: 'click', target: 'Edit' },
      { action: 'updateField', value: 'accrualDays' },
      { action: 'submit' },
      { action: 'expectToast', value: 'Leave policy updated' },
    ],
    expectedOutcome: {
      admin: 'PASS',
      director: 'NOT_APPLICABLE',
      delivery_manager: 'NOT_APPLICABLE',
      hr_manager: 'FAIL_EXPECTED',
      resource_manager: 'NOT_APPLICABLE',
      project_manager: 'NOT_APPLICABLE',
      employee: 'NOT_APPLICABLE',
      dual_role: 'NOT_APPLICABLE',
    },
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-15',
    title: 'Director views portfolio radiator',
    persona: 'director',
    steps: [
      { action: 'navigate', target: '/radiator' },
      { action: 'expectVisible', value: '16-axis radar' },
      { action: 'expectMinProjects', value: 5 },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-16',
    title: 'Director drills anomaly to underlying positions',
    persona: 'director',
    steps: [
      { action: 'navigate', target: '/dashboard/director' },
      { action: 'click', target: 'first anomaly KPI' },
      { action: 'expectRoute', value: 'filtered list' },
      { action: 'expectFilterPersisted', value: true },
    ],
    expectedOutcome: passFor(['admin', 'director']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-17',
    title: 'Director runs CPI what-if scenario',
    persona: 'director',
    steps: [
      { action: 'navigate', target: '/forensics' },
      { action: 'selectTab', value: 'CPI what-if' },
      { action: 'updateField', value: 'headcount delta = -5' },
      { action: 'click', target: 'Simulate' },
      { action: 'expectVisible', value: 'delta chart' },
    ],
    expectedOutcome: passFor(['admin', 'director']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-18',
    title: 'DM views team conflicts queue',
    persona: 'delivery_manager',
    steps: [
      { action: 'navigate', target: '/dashboard/delivery-manager' },
      { action: 'expectVisible', value: 'Conflicts section' },
      { action: 'click', target: 'View all conflicts' },
      { action: 'expectRoute', value: '/conflicts' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-19',
    title: 'DM escalates a rejection',
    persona: 'delivery_manager',
    steps: [
      { action: 'navigate', target: '/approvals' },
      { action: 'filterTab', value: 'Rejected' },
      { action: 'selectRow', value: 'first row' },
      { action: 'click', target: 'Escalate' },
      { action: 'fillForm', fields: { reason: 'Needs director call' } },
      { action: 'submit' },
      { action: 'expectStatus', value: 'ESCALATED' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-20',
    title: 'DM confirms an escalation',
    persona: 'delivery_manager',
    steps: [
      { action: 'navigate', target: '/approvals?filter=escalated' },
      { action: 'selectRow', value: 'escalation from J-19' },
      { action: 'click', target: 'Confirm' },
      { action: 'expectStatus', value: 'CONFIRMED' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager']),
    blockedBy: 'J-19',
    owner: 'QA',
  },
  {
    id: 'J-21',
    title: 'Admin runs the setup wizard',
    persona: 'admin',
    steps: [
      { action: 'navigate', target: '/setup' },
      { action: 'expectVisible', value: 'preflight screen' },
      { action: 'advanceScreens', value: 8 },
      { action: 'expectVisible', value: 'Setup complete' },
    ],
    expectedOutcome: passFor(['admin']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-22',
    title: 'Admin defines a custom role preset',
    persona: 'admin',
    steps: [
      { action: 'navigate', target: '/admin/access-policies/edit' },
      { action: 'selectRow', value: 'EXEC_ROLES' },
      { action: 'click', target: 'Edit' },
      { action: 'updateField', value: 'add resource_manager' },
      { action: 'submit' },
      { action: 'expectToast', value: 'Role preset updated' },
    ],
    expectedOutcome: passFor(['admin']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-23',
    title: 'Admin configures SSO',
    persona: 'admin',
    steps: [
      { action: 'navigate', target: '/admin/integrations/registry' },
      { action: 'selectRow', value: 'Microsoft 365' },
      { action: 'click', target: 'Configure' },
      { action: 'submit' },
      { action: 'expectStatus', value: 'CONFIGURED' },
    ],
    expectedOutcome: passFor(['admin']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-24',
    title: 'Admin views the audit log',
    persona: 'admin',
    steps: [
      { action: 'navigate', target: '/admin/audit' },
      { action: 'expectVisible', value: 'audit timeline' },
      { action: 'filter', value: 'actionType=UPDATE' },
      { action: 'expectMinRows', value: 1 },
    ],
    expectedOutcome: passFor(['admin', 'director', 'hr_manager', 'dual_role']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-25',
    title: 'Employee uses /me workspace',
    persona: 'employee',
    steps: [
      { action: 'navigate', target: '/me' },
      { action: 'expectVisible', value: 'Time + Approvals + Tasks tabs' },
      { action: 'selectTab', value: 'Tasks' },
      { action: 'expectMinRows', value: 0 },
    ],
    expectedOutcome: fullPass(),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-26',
    title: "Employee endorses a peer's skill",
    persona: 'employee',
    steps: [
      { action: 'navigate', target: '/people' },
      { action: 'selectRow', value: 'first peer' },
      { action: 'selectTab', value: 'Skills' },
      { action: 'click', target: 'Endorse' },
      { action: 'expectToast', value: 'Skill endorsed' },
    ],
    expectedOutcome: fullPass(),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-27',
    title: 'PM exports a budget report',
    persona: 'project_manager',
    steps: [
      { action: 'navigate', target: '/reports' },
      { action: 'selectTab', value: 'Budget' },
      { action: 'click', target: 'Export XLSX' },
      { action: 'expectDownload', value: '*.xlsx' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager', 'resource_manager', 'project_manager']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-28',
    title: 'PM views forensics',
    persona: 'project_manager',
    steps: [
      { action: 'navigate', target: '/forensics' },
      { action: 'expectVisible', value: 'forensics timeline' },
      { action: 'selectTab', value: 'Variance' },
      { action: 'expectMinRows', value: 1 },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager', 'project_manager']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-29',
    title: 'RM saves a planner scenario',
    persona: 'resource_manager',
    steps: [
      { action: 'navigate', target: '/staffing-desk?view=planner' },
      { action: 'configureFilters', value: 'role=Dev, fte=1.0' },
      { action: 'click', target: 'Save scenario' },
      { action: 'fillForm', fields: { name: 'Q3 Dev Plan' } },
      { action: 'submit' },
      { action: 'expectToast', value: 'Scenario saved' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager', 'resource_manager', 'project_manager', 'dual_role']),
    blockedBy: null,
    owner: 'QA',
  },
  {
    id: 'J-30',
    title: 'RM applies a planner scenario',
    persona: 'resource_manager',
    steps: [
      { action: 'navigate', target: '/staffing-desk?view=planner' },
      { action: 'selectScenario', value: 'Q3 Dev Plan' },
      { action: 'click', target: 'Apply' },
      { action: 'confirmDialog' },
      { action: 'expectToast', value: 'Scenario applied' },
    ],
    expectedOutcome: passFor(['admin', 'director', 'delivery_manager', 'resource_manager', 'project_manager', 'dual_role']),
    blockedBy: 'J-29',
    owner: 'QA',
  },
];

export function expectedOutcomesByJourney(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const j of SOAK_JOURNEYS) {
    out[j.id] = { ...j.expectedOutcome };
  }
  return out;
}
