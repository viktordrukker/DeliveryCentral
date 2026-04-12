/**
 * Minimal inline SVG icon set for sidebar navigation.
 * These are simplified versions of common UI icons, implemented without
 * an external package since lucide-react cannot be installed.
 */
interface NavIconProps {
  name: string;
  size?: number;
}

const ICONS: Record<string, string> = {
  // Dashboard — 4-square grid
  dashboard: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
  // Briefcase — projects
  projects: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM8 7V5a2 2 0 014 0v2',
  // Clipboard — assignments
  assignments: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 014 0M9 12h6M9 16h4',
  // Person — people
  people: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  // Two people — teams
  teams: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  // Network
  org: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v4m0 0H5m4 0h10m0-4v4m0 0h-4M3 7v10a2 2 0 002 2h4m-6-6h18m0-4v10a2 2 0 01-2 2h-4',
  // Clock
  timesheets: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 5v7l5 2.5',
  // File with check
  evidence: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 15l2 2 4-4',
  // Person with plus
  staffing: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6',
  // Database cylinders
  pools: 'M12 2C6.48 2 2 4.24 2 7v10c0 2.76 4.48 5 10 5s10-2.24 10-5V7c0-2.76-4.48-5-10-5zm0 13c-4.42 0-8-1.12-8-2.5v-3c1.72 1.11 4.7 1.5 8 1.5s6.28-.39 8-1.5v3c0 1.38-3.58 2.5-8 2.5z',
  // Message bubble
  cases: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  // Shield
  audit: 'M12 2l9 4.5v5.5a9 9 0 01-9 8.5A9 9 0 013 12V6.5L12 2z',
  // Monitor screen
  monitoring: 'M20 3H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2zm-1 12H5V6h14v9zm-5 4H9l-1 2h8l-1-2z',
  // Gear / settings
  settings: 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 00-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1zM12 9a3 3 0 100 6 3 3 0 000-6z',
  // Bar chart
  reports: 'M18 20V10M12 20V4M6 20v-6',
  // User check — leave
  leave: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  // Grid — workload
  workload: 'M3 3h18v18H3V3zm6 6v-3M9 9h3M12 6v3M12 9h3M3 9h3M3 15h3M6 12h3M21 9h-3M21 15h-3M18 12h-3M9 15h3M12 15h3M9 12v3M12 12v3',
  // Arrow right-left — planned vs actual
  pva: 'M8 3L3 8l5 5M3 8h18M16 21l5-5-5-5M21 16H3',
  // Layers — staffing board
  board: 'M12 2l10 7-10 7L2 9l10-7zm0 7v13M2 9v7l10 7 10-7V9',
  // Lightning — integrations
  integrations: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  // Help circle
  default: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 14v-2m0-4a2 2 0 10.001-4.001A2 2 0 0012 10z',
};

/** Map a route path or title to an icon key */
function getIconKey(path: string, title: string): string {
  const lower = (path + title).toLowerCase();
  if (lower.includes('dashboard') || lower.includes('/')) return 'dashboard';
  if (lower.includes('project')) return 'projects';
  if (lower.includes('assignment') || lower.includes('clipboard')) return 'assignments';
  if (lower.includes('people') || lower.includes('employee') || lower.includes('person')) return 'people';
  if (lower.includes('team')) return 'teams';
  if (lower.includes('org')) return 'org';
  if (lower.includes('timesheet') || lower.includes('time off') || lower.includes('leave')) return lower.includes('leave') ? 'leave' : 'timesheets';
  if (lower.includes('evidence') || lower.includes('work-evidence')) return 'evidence';
  if (lower.includes('staffing-request') || lower.includes('staffing request')) return 'staffing';
  if (lower.includes('resource-pool') || lower.includes('pool')) return 'pools';
  if (lower.includes('case')) return 'cases';
  if (lower.includes('audit') || lower.includes('business')) return 'audit';
  if (lower.includes('monitor')) return 'monitoring';
  if (lower.includes('setting') || lower.includes('admin')) return 'settings';
  if (lower.includes('report') || lower.includes('capital') || lower.includes('utiliz')) return 'reports';
  if (lower.includes('workload')) return 'workload';
  if (lower.includes('planned') || lower.includes('actual')) return 'pva';
  if (lower.includes('staffing-board') || lower.includes('board')) return 'board';
  if (lower.includes('integrat')) return 'integrations';
  if (lower.includes('exception')) return 'audit';
  return 'default';
}

export function NavIcon({ name, size = 18 }: NavIconProps): JSX.Element {
  const d = ICONS[name] ?? ICONS.default;
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
    >
      <path d={d} />
    </svg>
  );
}

export { getIconKey };
