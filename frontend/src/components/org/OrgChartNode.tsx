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

const AVATAR_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828', '#00838f', '#558b2f'];

function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/* ── Status helpers ────────────────────────────────────────────────────────── */

function statusDot(status: string): { color: string; label: string } {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return { color: '#22c55e', label: 'Active' };
    case 'ON_LEAVE':
    case 'ONLEAVE':
      return { color: '#f59e0b', label: 'On Leave' };
    case 'OFFBOARDED':
    case 'TERMINATED':
      return { color: '#ef4444', label: 'Offboarded' };
    case 'ONBOARDING':
      return { color: '#3b82f6', label: 'Onboarding' };
    default:
      return { color: '#94a3b8', label: status };
  }
}

function allocRingColor(totalPct: number): string {
  if (totalPct === 0) return '#94a3b8';
  if (totalPct > 100) return '#ef4444';
  if (totalPct > 80) return '#f59e0b';
  return '#22c55e';
}

function allocBarColor(pct: number): string {
  if (pct >= 100) return 'rgba(211,47,47,.20)';
  if (pct >= 80) return 'rgba(245,124,0,.20)';
  if (pct >= 50) return 'rgba(46,125,50,.26)';
  return 'rgba(46,125,50,.14)';
}

function allocTextColor(pct: number): string {
  if (pct >= 100) return '#b71c1c';
  if (pct >= 80) return '#e65100';
  if (pct >= 50) return '#1b5e20';
  return '#2e7d32';
}

/* ── Person health colors (mirrors department health) ─────────────────────── */

const PERSON_HEALTH: Record<string, { border: string; bg: string }> = {
  green: { border: '#22c55e', bg: '#f0fdf4' },
  yellow: { border: '#eab308', bg: '#fefce8' },
  red: { border: '#ef4444', bg: '#fef2f2' },
  neutral: { border: '#94a3b8', bg: '#f8fafc' },
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
        border: 2px solid #6366f1; border-radius: 10px;
        background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
        display: flex; align-items: center; justify-content: center;
        font-family: inherit; font-size: 13px; font-weight: 700;
        color: #4338ca; cursor: default; box-sizing: border-box;
      ">Organization</div>`;
  }

  const colors = personHealth(node);
  const avatar = avatarColor(node.displayName);
  const initial = escapeHtml(node.displayName.charAt(0).toUpperCase());
  const status = statusDot(node.lifecycleStatus);
  const isMatch = searchTerm.length > 0 && node.displayName.toLowerCase().includes(searchTerm.toLowerCase());
  const borderColor = isMatch ? '#f59e0b' : colors.border;
  const bgColor = isMatch ? '#fef9c3' : colors.bg;

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
    assignmentsHtml = '<div style="font-size: 10px; color: #94a3b8; font-style: italic;">No assignments</div>';
  }

  // Allocation bar
  const utilWidth = Math.min(node.totalAllocation, 100);
  const utilColor = node.totalAllocation > 100 ? '#ef4444' : node.totalAllocation > 80 ? '#f59e0b' : '#22c55e';

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
    " onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)'" onmouseout="this.style.boxShadow='none'">

      <!-- Header: Avatar + Name + Status -->
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="
          width: 28px; height: 28px;
          border-radius: 50%;
          background: ${colors.border}33;
          border: 1px solid ${colors.border};
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: ${colors.border};
          flex-shrink: 0;
        ">${initial}</div>
        <div style="overflow: hidden; flex: 1; min-width: 0;">
          <div style="font-size: 12px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(node.displayName)}
          </div>
          <div style="font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
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
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748b; margin-bottom: 2px;">
          <span>${node.assignmentCount} assignment${node.assignmentCount !== 1 ? 's' : ''}</span>
          <span style="font-weight: 700; color: ${utilColor};">${node.totalAllocation}%</span>
        </div>
        <div style="height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
          <div style="height: 100%; width: ${utilWidth}%; background: ${utilColor}; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
      </div>
    </div>
  `;
}

/* ── Department node (220 × 120) — legacy ──────────────────────────────────── */

const HEALTH_COLORS: Record<string, { border: string; bg: string }> = {
  green: { border: '#22c55e', bg: '#f0fdf4' },
  yellow: { border: '#eab308', bg: '#fefce8' },
  red: { border: '#ef4444', bg: '#fef2f2' },
};

export function renderDeptNodeContent(
  node: FlatOrgNode,
  width: number,
  height: number,
  searchTerm: string,
): string {
  const colors = HEALTH_COLORS[node.healthStatus] ?? HEALTH_COLORS.green;
  const isMatch = searchTerm.length > 0 && node.name.toLowerCase().includes(searchTerm.toLowerCase());
  const borderColor = isMatch ? '#f59e0b' : colors.border;
  const bgColor = isMatch ? '#fef9c3' : colors.bg;

  const utilBar = Math.min(100, Math.max(0, node.utilization));
  const utilColor = utilBar > 100 ? '#ef4444' : utilBar > 80 ? '#eab308' : '#22c55e';

  // Build compact alert badges
  let alertsHtml = '';
  if (node.overallocated > 0) {
    alertsHtml += `<span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(239,68,68,.12); color: #991b1b; font-weight: 600;">\u26A0 ${node.overallocated} over</span>`;
  }
  if (node.onBench > 0) {
    alertsHtml += `<span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(245,158,11,.12); color: #92400e; font-weight: 600;">${node.onBench} bench</span>`;
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
    " onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)'" onmouseout="this.style.boxShadow='none'">
      <!-- Avatar + Name -->
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="
          width: 28px; height: 28px;
          border-radius: 50%;
          background: ${colors.border}33;
          border: 1px solid ${colors.border};
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: ${colors.border};
          flex-shrink: 0;
        ">${node.name.charAt(0)}</div>
        <div style="overflow: hidden;">
          <div style="font-size: 12px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(node.name)}</div>
          <div style="font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(node.manager?.displayName ?? 'No manager')}</div>
        </div>
      </div>

      <!-- Type badge + member/assignment counts -->
      <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
        <span style="
          font-size: 9px; padding: 1px 6px; border-radius: 4px;
          background: #dbeafe; color: #1d4ed8; font-weight: 500;
        ">${node.kind ? escapeHtml(humanizeEnum(node.kind, ORG_UNIT_TYPE_LABELS)) : 'Unit'}</span>
        <span style="font-size: 10px; color: #64748b;">${node.memberCount} members</span>
        <span style="font-size: 10px; color: #94a3b8;">\u00B7 ${node.activeAssignments} assignments</span>
      </div>

      <!-- Alert badges -->
      ${alertsHtml ? `<div style="display: flex; gap: 4px; flex-wrap: wrap;">${alertsHtml}</div>` : ''}

      <!-- Avg Allocation bar -->
      <div style="margin-top: auto;">
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748b; margin-bottom: 2px;">
          <span>Avg. Allocation</span>
          <span style="font-weight: 700; color: ${utilColor};">${utilBar}%</span>
        </div>
        <div style="height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
          <div style="height: 100%; width: ${utilBar}%; background: ${utilColor}; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
      </div>
    </div>
  `;
}
