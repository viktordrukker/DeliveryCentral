import { humanizeEnum, ORG_UNIT_TYPE_LABELS } from '@/lib/labels';
import type { FlatOrgNode } from './InteractiveOrgChart';

const HEALTH_COLORS: Record<string, { border: string; bg: string }> = {
  green: { border: '#22c55e', bg: '#f0fdf4' },
  yellow: { border: '#eab308', bg: '#fefce8' },
  red: { border: '#ef4444', bg: '#fef2f2' },
};

export function renderOrgChartNodeContent(
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
  const utilColor = utilBar > 90 ? '#ef4444' : utilBar > 70 ? '#eab308' : '#22c55e';

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

      <!-- Role/Type badge -->
      <div style="display: flex; gap: 4px; align-items: center;">
        <span style="
          font-size: 9px; padding: 1px 6px; border-radius: 4px;
          background: #dbeafe; color: #1d4ed8; font-weight: 500;
        ">${escapeHtml(humanizeEnum(node.kind, ORG_UNIT_TYPE_LABELS))}</span>
        <span style="font-size: 10px; color: #94a3b8;">${node.memberCount} members</span>
      </div>

      <!-- Utilization bar -->
      <div style="margin-top: auto;">
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748b; margin-bottom: 2px;">
          <span>Utilization</span>
          <span>${utilBar}%</span>
        </div>
        <div style="height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
          <div style="height: 100%; width: ${utilBar}%; background: ${utilColor}; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
