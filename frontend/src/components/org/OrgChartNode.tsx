import { humanizeEnum, ORG_UNIT_TYPE_LABELS } from '@/lib/labels';
import type { FlatOrgNode, FlatPersonNode } from './InteractiveOrgChart';
import { SYNTHETIC_ROOT_ID } from './InteractiveOrgChart';

/* ── Shared helpers ────────────────────────────────────────────────────────── */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const AVATAR_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
];

function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/* ── Status helpers ────────────────────────────────────────────────────────── */

function statusDot(status: string): { color: string; label: string } {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return { color: 'var(--color-status-active)', label: 'Active' };
    case 'ON_LEAVE':
    case 'ONLEAVE':
      return { color: 'var(--color-status-warning)', label: 'On Leave' };
    case 'OFFBOARDED':
    case 'TERMINATED':
      return { color: 'var(--color-status-danger)', label: 'Offboarded' };
    case 'ONBOARDING':
      return { color: 'var(--color-status-info)', label: 'Onboarding' };
    default:
      return { color: 'var(--color-status-neutral)', label: status };
  }
}

function allocRingColor(totalPct: number): string {
  if (totalPct === 0) return 'var(--color-status-neutral)';
  if (totalPct > 100) return 'var(--color-status-danger)';
  if (totalPct > 80) return 'var(--color-status-warning)';
  return 'var(--color-status-active)';
}

function allocBarColor(pct: number): string {
  if (pct >= 100) return 'color-mix(in srgb, var(--color-status-danger) 20%, transparent)';
  if (pct >= 80) return 'color-mix(in srgb, var(--color-status-warning) 20%, transparent)';
  if (pct >= 50) return 'color-mix(in srgb, var(--color-status-active) 26%, transparent)';
  return 'color-mix(in srgb, var(--color-status-active) 14%, transparent)';
}

function allocTextColor(pct: number): string {
  if (pct >= 100) return 'var(--color-status-danger)';
  if (pct >= 80) return 'var(--color-status-warning)';
  if (pct >= 50) return 'var(--color-status-active)';
  return 'var(--color-status-active)';
}

/* ── Person health colors (mirrors department health) ─────────────────────── */

const PERSON_HEALTH: Record<string, { border: string; bg: string }> = {
  green: { border: 'var(--color-status-active)', bg: 'var(--color-status-active-bg)' },
  yellow: { border: 'var(--color-status-warning)', bg: 'var(--color-status-warning-bg)' },
  red: { border: 'var(--color-status-danger)', bg: 'var(--color-status-danger-bg)' },
  neutral: { border: 'var(--color-status-neutral)', bg: 'var(--color-surface-alt)' },
};

function personHealth(node: FlatPersonNode): { border: string; bg: string } {
  if (node.lifecycleStatus.toUpperCase() !== 'ACTIVE') return PERSON_HEALTH.neutral;
  if (node.totalAllocation > 100) return PERSON_HEALTH.red;
  if (node.totalAllocation === 0) return PERSON_HEALTH.yellow;
  return PERSON_HEALTH.green;
}

/* ── Person node (280 × 160) ───────────────────────────────────────────────── */

export function renderPersonNodeContent(
  node: FlatPersonNode,
  width: number,
  height: number,
  searchTerm: string,
): string {
  // Render synthetic root as a minimal header node
  if (node.id === SYNTHETIC_ROOT_ID) {
    return `
      <div style="
        width: ${width}px; height: 48px;
        border: 2px solid var(--color-accent); border-radius: 10px;
        background: var(--color-accent-soft);
        display: flex; align-items: center; justify-content: center;
        font-family: inherit; font-size: 13px; font-weight: 700;
        color: var(--color-accent-text); cursor: default; box-sizing: border-box;
      ">Organization</div>`;
  }

  const colors = personHealth(node);
  const avatar = avatarColor(node.displayName);
  const initial = escapeHtml(node.displayName.charAt(0).toUpperCase());
  const status = statusDot(node.lifecycleStatus);
  const isMatch = searchTerm.length > 0 && node.displayName.toLowerCase().includes(searchTerm.toLowerCase());
  const borderColor = isMatch ? 'var(--color-status-warning)' : colors.border;
  const bgColor = isMatch ? 'var(--color-status-warning-bg)' : colors.bg;

  // Build assignment bars HTML (top 3)
  let assignmentsHtml = '';
  if (node.topAssignments.length > 0) {
    assignmentsHtml = node.topAssignments
      .map(
        (a) => `
      <a href="/projects/${escapeHtml(a.projectId)}" style="
        display: flex; align-items: center; justify-content: space-between;
        gap: 4px; text-decoration: none; color: ${allocTextColor(a.pct)};
        font-size: 10px; padding: 2px 4px; border-radius: 3px;
        background: ${allocBarColor(a.pct)};
      " title="${escapeHtml(a.projectName)} — ${a.pct}%"
         onclick="event.stopPropagation()">
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; font-weight: 600;">${escapeHtml(a.projectName)}</span>
        <span style="flex-shrink: 0; font-weight: 700;">${a.pct}%</span>
      </a>`,
      )
      .join('');
  } else {
    assignmentsHtml = '<div style="font-size: 10px; color: var(--color-text-subtle); font-style: italic;">No positions</div>';
  }

  // Allocation bar
  const utilWidth = Math.min(node.totalAllocation, 100);
  const utilColor = node.totalAllocation > 100 ? 'var(--color-status-danger)' : node.totalAllocation > 80 ? 'var(--color-status-warning)' : 'var(--color-status-active)';

  return `
    <div class="person-node" style="
      width: ${width}px;
      height: ${height}px;
      border: 2px solid ${borderColor};
      border-radius: 8px;
      background: ${bgColor};
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-family: inherit;
      box-sizing: border-box;
      cursor: pointer;
      transition: box-shadow 0.15s;
    " onmouseover="this.style.boxShadow='var(--shadow-card-hover)'" onmouseout="this.style.boxShadow='none'">

      <!-- Header: Avatar + Name + Status -->
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="
          width: 28px; height: 28px;
          border-radius: 50%;
          background: color-mix(in srgb, ${colors.border} 20%, transparent);
          border: 1px solid ${colors.border};
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: ${colors.border};
          flex-shrink: 0;
        ">${initial}</div>
        <div style="overflow: hidden; flex: 1; min-width: 0;">
          <div style="font-size: 12px; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(node.displayName)}
          </div>
          <div style="font-size: 10px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(node.orgUnitName ?? 'No team')}
          </div>
        </div>
        <div style="
          width: 8px; height: 8px; border-radius: 50%;
          background: ${status.color}; flex-shrink: 0;
        " title="${status.label}"></div>
      </div>

      <!-- Assignment bars -->
      <div style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-height: 0; overflow: hidden;">
        ${assignmentsHtml}
      </div>

      <!-- Allocation bar -->
      <div style="margin-top: auto;">
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: var(--color-text-muted); margin-bottom: 2px;">
          <span>${node.assignmentCount} assignment${node.assignmentCount !== 1 ? 's' : ''}</span>
          <span style="font-weight: 700; color: ${utilColor};">${node.totalAllocation}%</span>
        </div>
        <div style="height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden;">
          <div style="height: 100%; width: ${utilWidth}%; background: ${utilColor}; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
      </div>
    </div>
  `;
}

/* ── Department node (220 × 120) — legacy ──────────────────────────────────── */

const HEALTH_COLORS: Record<string, { border: string; bg: string }> = {
  green: { border: 'var(--color-status-active)', bg: 'var(--color-status-active-bg)' },
  yellow: { border: 'var(--color-status-warning)', bg: 'var(--color-status-warning-bg)' },
  red: { border: 'var(--color-status-danger)', bg: 'var(--color-status-danger-bg)' },
};

export function renderDeptNodeContent(
  node: FlatOrgNode,
  width: number,
  height: number,
  searchTerm: string,
): string {
  const colors = HEALTH_COLORS[node.healthStatus] ?? HEALTH_COLORS.green;
  const isMatch = searchTerm.length > 0 && node.name.toLowerCase().includes(searchTerm.toLowerCase());
  const borderColor = isMatch ? 'var(--color-status-warning)' : colors.border;
  const bgColor = isMatch ? 'var(--color-status-warning-bg)' : colors.bg;

  const utilBar = Math.min(100, Math.max(0, node.utilization));
  const utilColor = utilBar > 100 ? 'var(--color-status-danger)' : utilBar > 80 ? 'var(--color-status-warning)' : 'var(--color-status-active)';

  // Build compact alert badges
  let alertsHtml = '';
  if (node.overallocated > 0) {
    alertsHtml += `<span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: color-mix(in srgb, var(--color-status-danger) 12%, transparent); color: var(--color-status-danger); font-weight: 600;">\u26A0 ${node.overallocated} over</span>`;
  }
  if (node.onBench > 0) {
    alertsHtml += `<span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: color-mix(in srgb, var(--color-status-warning) 12%, transparent); color: var(--color-status-warning); font-weight: 600;">${node.onBench} bench</span>`;
  }

  return `
    <div style="
      width: ${width}px;
      height: ${height}px;
      border: 2px solid ${borderColor};
      border-radius: 8px;
      background: ${bgColor};
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-family: inherit;
      box-sizing: border-box;
      cursor: pointer;
      transition: box-shadow 0.15s;
    " onmouseover="this.style.boxShadow='var(--shadow-card-hover)'" onmouseout="this.style.boxShadow='none'">
      <!-- Avatar + Name -->
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="
          width: 28px; height: 28px;
          border-radius: 50%;
          background: color-mix(in srgb, ${colors.border} 20%, transparent);
          border: 1px solid ${colors.border};
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: ${colors.border};
          flex-shrink: 0;
        ">${node.name.charAt(0)}</div>
        <div style="overflow: hidden;">
          <div style="font-size: 12px; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(node.name)}</div>
          <div style="font-size: 10px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(node.manager?.displayName ?? 'No manager')}</div>
        </div>
      </div>

      <!-- Type badge + member/assignment counts -->
      <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
        <span style="
          font-size: 9px; padding: 1px 6px; border-radius: 4px;
          background: var(--color-accent-soft); color: var(--color-accent-text); font-weight: 500;
        ">${node.kind ? escapeHtml(humanizeEnum(node.kind, ORG_UNIT_TYPE_LABELS)) : 'Unit'}</span>
        <span style="font-size: 10px; color: var(--color-text-muted);">${node.memberCount} members</span>
        <span style="font-size: 10px; color: var(--color-text-subtle);">\u00B7 ${node.activeAssignments} positions</span>
      </div>

      <!-- Alert badges -->
      ${alertsHtml ? `<div style="display: flex; gap: 4px; flex-wrap: wrap;">${alertsHtml}</div>` : ''}

      <!-- Avg Allocation bar -->
      <div style="margin-top: auto;">
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: var(--color-text-muted); margin-bottom: 2px;">
          <span>Avg. Allocation</span>
          <span style="font-weight: 700; color: ${utilColor};">${utilBar}%</span>
        </div>
        <div style="height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden;">
          <div style="height: 100%; width: ${utilBar}%; background: ${utilColor}; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
      </div>
    </div>
  `;
}
